import os
import gc
import contextlib
from flask import Flask, request, jsonify, render_template, url_for
from PIL import Image, ImageOps
import torch
import numpy as np
import keras
import tensorflow as tf
from huggingface_hub import from_pretrained_keras
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import multiprocessing

os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"  # For M1 Mac GPU support
os.environ["TF_FORCE_GPU_ALLOW_GROWTH"] = "true"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

app = Flask(__name__)

limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=["750 per day", "250 per hour"] 
)

limiter.init_app(app)

DETECTED_IMAGE_DIR = 'static/detected'
os.makedirs(DETECTED_IMAGE_DIR, exist_ok=True)

_models = {}

def get_model(model_name):
    if model_name not in _models:
        if model_name == 'yolo':
            _models[model_name] = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True).eval()
        elif model_name == 'mirnet':
            _models[model_name] = from_pretrained_keras("keras-io/lowlight-enhance-mirnet", compile=False)
    return _models[model_name]

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/enhance", methods=["POST"])
@limiter.limit("5 per minute") 
def enhance_image():
    file = request.files.get("imageFile")
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    enhanced_filename, image_url = process_image(file, enhance=True)

    return jsonify({'enhancedImageUrl': image_url})

@app.route("/detect", methods=["POST"])
@limiter.limit("100 per minute")
def detect():
    file = request.files.get("imageFile")
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    detected_filename, image_url = process_image(file, enhance=False, detect=True)

    return jsonify({'imageUrl': image_url})

def process_image(file, enhance=False, detect=False):
    try:
        image = Image.open(file.stream).convert("RGB")
        image = ImageOps.exif_transpose(image)
    except IOError:
        raise ValueError('Invalid image file')

    if enhance:
        max_dim = 1024
        w, h = image.size
        if w > max_dim or h > max_dim:
            ratio = max_dim / max(w, h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            image = image.resize((new_w, new_h), Image.LANCZOS)
            print(f"Resized image from {w}x{h} to {new_w}x{new_h}")
        
        w, h = image.size
        new_w, new_h = w - (w % 4), h - (h % 4)
        if new_w != w or new_h != h:
            image = image.crop((0, 0, new_w, new_h))
            
        img_array = keras.utils.img_to_array(image)
        img_array = img_array.astype("float32") / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        mirnet_model = get_model('mirnet')
        
        with tf.device('/cpu:0'):  # Force CPU to avoid GPU resource issues
            output = mirnet_model.predict(img_array, verbose=0)
        
        tf.keras.backend.clear_session()
        
        output_image = output[0] * 255.0
        output_image = output_image.clip(0, 255)
        output_image = np.uint8(output_image) 
        
        image = Image.fromarray(output_image)
    

    if detect:
        model = get_model('yolo')
        
        with torch.no_grad():
            results = model(image, size=640)
            results.render() 
        
        if len(results.ims) > 0: 
            image = Image.fromarray(results.ims[0])
        
        torch.cuda.empty_cache()

    filename_prefix = 'enhanced_' if enhance else 'detected_'
    filename = filename_prefix + file.filename
    save_path = os.path.join(DETECTED_IMAGE_DIR, filename)
    image.save(save_path)

    image_url = url_for('static', filename=os.path.join('detected', filename))
    
    gc.collect()

    return filename, image_url

import atexit

@atexit.register
def cleanup():
    tf.keras.backend.clear_session()
    
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    for model_name in list(_models.keys()):
        del _models[model_name]
    
    gc.collect()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)