document.addEventListener('DOMContentLoaded', function() {

    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(function(error) {
            console.error('Error locking orientation:', error);
        });
    }
    const welcome = document.getElementById('welcome-section');
    const sections = document.querySelectorAll('.main-content .content-section');

    function hideAllSections() {
        sections.forEach(section => {
            section.style.display = 'none';
        });
    }

    const links = document.querySelectorAll('.sidebar a[data-target]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            links.forEach(link => link.classList.remove('active'));
            hideAllSections(); 
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'block';
        });
    });

    welcome.style.display = 'block';

    const fileInputEnhance = document.querySelector('#enhanceForm input[type="file"]');
    fileInputEnhance.addEventListener('change', function() {
        const file = this.files[0];
        const start = document.getElementById('start');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImg = document.getElementById('enhance-preview-img');
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                start.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    const fileInputDetect = document.querySelector('#uploadForm input[type="file"]');
    fileInputDetect.addEventListener('change', function() {
        const file = this.files[0];
        const startD = document.getElementById('startD');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImg = document.getElementById('detection-preview-img');
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                startD.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('enhanceForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const enhancementBtn = document.getElementById('enhancement-btn');
        enhancementBtn.textContent = 'Enhancing...';
        const formData = new FormData(this);
        fetch('/enhance', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.ok ? response.json() : Promise.reject(response.statusText))
        .then(data => {
            if (data.error) {
            console.error('Server Error:', data.error);
            document.getElementById('enhanceFeedbackP').textContent = 'Failed to enhance image.';
            } else {
                const enhancedImg = document.getElementById('enhanced-img');
                const previewImg = document.getElementById('enhance-preview-img');

                const originalPreviewSrc = previewImg.src;

                enhancedImg.style.display = 'flex';
                enhancedImg.src = data.enhancedImageUrl;

                if (window.innerWidth <= 1200) {
                    previewImg.src = data.enhancedImageUrl;
                    document.getElementById('enhanceFeedbackP').textContent = 'Image enhanced successfully';
                } else {
                    document.getElementById('enhanceFeedbackP').textContent = 'Image enhanced successfully';
                    document.getElementById('thumb').style.display = 'block';
                    document.getElementById('enhancement').style.display = 'flex';
                    document.getElementById('eyeImage').style.display = 'none';
                    document.getElementById('enhancement').style.border = '2px solid var(--secondary-color)';
                }
                
                const mediaQuery = window.matchMedia('(orientation: landscape) and (max-device-width: 950px)');
                if (mediaQuery.matches) {
                    previewImg.src = originalPreviewSrc;
                    document.getElementById('eyeImage').style.display = 'none';
                    document.getElementById('enhancement').style.border = '2px solid var(--secondary-color)';
                }
            }
            enhancementBtn.textContent = 'Enhance';
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('enhanceFeedbackP').textContent = 'An error occurred during the enhancement.';
            enhancementBtn.textContent = 'Enhance';
        });
    });

    document.getElementById('uploadForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const detectionBtn = document.getElementById('detection-btn');
        detectionBtn.textContent = 'Detecting...';
        const formData = new FormData(this);
        fetch('/detect', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.ok ? response.json() : Promise.reject(response.statusText))
        .then(data => {
            if(data.error) {
                console.error('Server error:', data.error);
                document.getElementById('detectFeedbackP').textContent = 'Failed to process image.';
            } else {
                const predictedImg = document.getElementById('detected-img');
                const previewImg = document.getElementById('detection-preview-img');

                const originalDetectPreviewSrc = previewImg.src;

                predictedImg.src = data.imageUrl;
                predictedImg.style.display = 'flex';

                if (window.innerWidth <= 1200) {
                    previewImg.src = data.imageUrl;
                    document.getElementById('detectFeedbackP').textContent = 'Object(s) detected successfully';
                } else {
                    document.getElementById('detectFeedbackP').textContent = 'Object(s) detected successfully';
                    document.getElementById('thumbD').style.display = 'block';
                    document.getElementById('detection').style.display = 'felx';
                    document.getElementById('eyeImageD').style.display = 'none';
                    document.getElementById('detection').style.border = '2px solid var(--secondary-color)';
                }

                const mediaQuery = window.matchMedia('(orientation: landscape) and (max-device-width: 950px)');
                if (mediaQuery.matches) {
                    previewImg.src = originalDetectPreviewSrc;
                    document.getElementById('eyeImageD').style.display = 'none';
                    document.getElementById('detection').style.border = '2px solid var(--secondary-color)';
                }
            }
            detectionBtn.textContent = 'Detect';
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('detectFeedbackP').textContent = 'An error occurred during the upload.';
            detectionBtn.textContent = 'Detect';
        });
    });
});

const timeSidebar = document.getElementById('time');
const dateSidebar = document.getElementById('date');
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dateShow() {
    const date = new Date();
    const dayOfMonth = date.getDate();
    const day = date.getDay();
    const month = date.getMonth();
    return `${days[day]}` + `<br>` + `${months[month]}, ${dayOfMonth}`;
}

function timeShow() {
    const date = new Date();
    const hour = (date.getHours()<10?"0":"") + date.getHours();
    const min = (date.getMinutes()<10?"0":"") + date.getMinutes();
    const sec = (date.getSeconds()<10?"0":"") + date.getSeconds();
    return `${hour}:${min}:${sec}`;
}

setInterval(() => {
    timeSidebar.textContent = timeShow();
}, 1000);

dateSidebar.innerHTML = dateShow();