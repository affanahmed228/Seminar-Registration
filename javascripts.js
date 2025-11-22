// Camera Registration Application for GitHub Pages + Supabase
class CameraRegistrationApp {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isCameraOn = false;
        this.currentPhoto = null;
        
        // Initialize Supabase
        this.supabase = null;
        this.initSupabase();
        
        this.initializeApp();
    }
    
    initSupabase() {
        // You'll update these with your actual Supabase credentials
        const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
        const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE';
        
        this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized');
    }
    
    initializeApp() {
        // Camera event listeners
        document.getElementById('startButton').addEventListener('click', () => this.startCamera());
        document.getElementById('stopButton').addEventListener('click', () => this.stopCamera());
        document.getElementById('captureButton').addEventListener('click', () => this.capturePhoto());
        
        // Form event listeners
        document.getElementById('registrationForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('resetBtn').addEventListener('click', () => this.resetForm());
        
        this.updateButtonStates();
    }
    
    // Camera methods (keep your existing camera code)
    isCameraSupported() {
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        return hasGetUserMedia;
    }
    
    async startCamera() {
        if (!this.isCameraSupported()) {
            this.showMessage("Your browser doesn't support camera access.", "error");
            return;
        }
        
        try {
            this.stopCamera();
            
            console.log("Starting camera...");
            
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                console.log("Video metadata loaded");
                this.video.play()
                    .then(() => {
                        this.isCameraOn = true;
                        this.updateButtonStates();
                        this.showMessage("✅ Camera started successfully!", "success");
                    })
                    .catch(error => {
                        console.error("Error playing video:", error);
                        this.showMessage("Error starting video: " + error.message, "error");
                    });
            };
            
        } catch (error) {
            console.error("Camera error:", error);
            this.handleCameraError(error);
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
            this.video.srcObject = null;
            this.isCameraOn = false;
            this.updateButtonStates();
            this.showMessage("Camera stopped", "success");
        }
    }
    
    capturePhoto() {
        if (!this.isCameraOn) {
            this.showMessage("Please start the camera first!", "error");
            return;
        }
        
        try {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);
            
            this.currentPhoto = this.canvas.toDataURL('image/jpeg', 0.8);
            this.displayCurrentPhoto();
            
            this.showMessage("✅ Photo captured!", "success");
            
        } catch (error) {
            console.error("Capture error:", error);
            this.showMessage("Error capturing photo", "error");
        }
    }
    
    displayCurrentPhoto() {
        const container = document.getElementById('currentPhoto');
        container.innerHTML = this.currentPhoto ? 
            `<img src="${this.currentPhoto}" alt="Profile Photo" style="max-width: 300px; border: 3px solid #4CAF50; border-radius: 10px;">
             <div style="color: #4CAF50; margin-top: 10px;">✓ Photo ready for registration</div>` : 
            '<p style="color: #666;">No photo taken yet</p>';
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) return;
        
        if (!this.currentPhoto) {
            this.showMessage("Please capture a profile photo before submitting!", "error");
            return;
        }
        
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Registering...';
        submitBtn.disabled = true;
        
        try {
            const formData = {
                full_name: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                company: document.getElementById('company').value.trim(),
                position: document.getElementById('position').value.trim(),
                seminar_topic: document.getElementById('seminarTopic').value,
                dietary_requirements: document.getElementById('dietary').value,
                comments: document.getElementById('comments').value.trim(),
                profile_photo: this.currentPhoto, // Store as base64
                registration_date: new Date().toISOString()
            };
            
            // Save to Supabase
            const { data, error } = await this.supabase
                .from('registrations')
                .insert([formData]);
            
            if (error) {
                throw new Error(error.message);
            }
            
            this.showMessage("✅ Registration successful! Thank you for registering.", "success");
            this.resetForm();
            
        } catch (error) {
            console.error('Submit error:', error);
            this.showMessage('❌ Registration failed: ' + error.message, "error");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    validateForm() {
        this.clearErrors();
        let isValid = true;
        
        const fields = {
            name: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            topic: document.getElementById('seminarTopic').value
        };
        
        if (fields.name.length < 2) {
            this.showError('nameError', 'Name must be at least 2 characters');
            isValid = false;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
            this.showError('emailError', 'Valid email required');
            isValid = false;
        }
        
        const cleanPhone = fields.phone.replace(/[\s\-\(\)]/g, '');
        if (!/^[\+]?[1-9][\d]{0,15}$/.test(cleanPhone)) {
            this.showError('phoneError', 'Valid phone number required');
            isValid = false;
        }
        
        if (!fields.topic) {
            this.showError('topicError', 'Please select seminar topic');
            isValid = false;
        }
        
        return isValid;
    }
    
    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }
    
    clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
    }
    
    resetForm() {
        document.getElementById('registrationForm').reset();
        this.clearErrors();
        this.currentPhoto = null;
        document.getElementById('currentPhoto').innerHTML = '<p style="color: #666;">No photo taken yet</p>';
        this.stopCamera();
        this.hideMessage();
    }
    
    updateButtonStates() {
        const startBtn = document.getElementById('startButton');
        const stopBtn = document.getElementById('stopButton');
        const captureBtn = document.getElementById('captureButton');
        
        startBtn.disabled = this.isCameraOn;
        stopBtn.disabled = !this.isCameraOn;
        captureBtn.disabled = !this.isCameraOn;
    }
    
    showMessage(message, type) {
        const element = document.getElementById('responseMessage');
        element.textContent = message;
        element.className = `response-message ${type}`;
    }
    
    hideMessage() {
        document.getElementById('responseMessage').className = 'response-message';
    }
    
    handleCameraError(error) {
        let message = "Camera error: ";
        
        switch (error.name) {
            case 'NotAllowedError':
                message += "Please allow camera access";
                break;
            case 'NotFoundError':
                message += "No camera found";
                break;
            case 'NotSupportedError':
                message += "Browser doesn't support camera";
                break;
            case 'NotReadableError':
                message += "Camera in use by another app";
                break;
            default:
                message += error.message;
        }
        
        this.showMessage(message, "error");
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.cameraApp = new CameraRegistrationApp();
});