from flask import Flask, request, jsonify
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import base64
import time

app = Flask(__name__)

# Load YOLOv8 segmentation model
model = YOLO('yolov8n-seg.pt')  # Ensure the model file is available

def process_image(image):
    # Convert to OpenCV format
    img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    # Run YOLO inference
    results = model.predict(img, conf=0.5)
    # Plot results with segmentation masks
    plotted = results[0].plot()
    # Convert back to RGB
    return cv2.cvtColor(plotted, cv2.COLOR_BGR2RGB), results

@app.route('/process_image', methods=['POST'])
def process_image_route():
    try:
        # Get image from request
        image_file = request.files.get('image')
        if not image_file:
            return jsonify({'error': 'No image provided'}), 400
            
        # Read image
        image = Image.open(io.BytesIO(image_file.read()))
        
        # Process image
        start_time = time.time()
        processed_image, results = process_image(image)
        print(f"Processing time: {time.time() - start_time:.2f}s")
        
        # Convert to JPEG
        buffered = io.BytesIO()
        Image.fromarray(processed_image).save(buffered, format="JPEG")
        buffered.seek(0)
        
        # Extract detections
        detections = []
        for box in results[0].boxes:
            class_id = int(box.cls)
            class_name = model.names[class_id]
            confidence = float(box.conf)
            detections.append({'class': class_name, 'confidence': confidence})
        
        # Return image and detections as JSON
        image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        return jsonify({
            'image': image_base64,
            'detections': detections
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
