FROM python:3.9-slim-buster

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    gcc \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


RUN git clone https://github.com/ultralytics/yolov5.git

WORKDIR /app/yolov5
RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
    Flask \
    Pillow \
    torch \
    torchvision \
    Flask-Limiter \
    Werkzeug \
    gunicorn \
    opencv-python \
    numpy \
    huggingface_hub \
    keras \
    tensorflow \
    pandas

EXPOSE 8080

CMD ["python", "app.py"]
