let mediaRecorder;
let recordedChunks = [];
let recordingStartTime;
let timerInterval;

// Get API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const timer = document.getElementById('timer');
const status = document.getElementById('status');
const preview = document.getElementById('preview');
const previewVideo = document.getElementById('previewVideo');
const uploadBtn = document.getElementById('uploadBtn');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
uploadBtn.addEventListener('click', uploadRecording);

async function startRecording() {
  try {
    // Request screen capture with audio
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: 'screen' },
      audio: true
    });

    // Request microphone
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    // Combine streams
    const tracks = [
      ...displayStream.getVideoTracks(),
      ...displayStream.getAudioTracks(),
      ...audioStream.getAudioTracks()
    ];

    const combinedStream = new MediaStream(tracks);

    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      previewVideo.src = url;
      preview.style.display = 'block';
      
      // Store blob for upload
      previewVideo.recordedBlob = blob;
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = '🔴 Recording in progress...';
    status.className = 'status recording';

    // Start timer
    timerInterval = setInterval(updateTimer, 1000);

    // Stop recording if screen share is stopped
    displayStream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

  } catch (error) {
    console.error('Error starting recording:', error);
    status.textContent = '❌ Error: ' + error.message;
    status.className = 'status error';
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    status.textContent = '✅ Recording stopped. Ready to upload!';
    status.className = 'status success';
    
    clearInterval(timerInterval);
  }
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  timer.textContent = `${minutes}:${seconds}`;
}

async function uploadRecording() {
  const title = titleInput.value.trim();
  if (!title) {
    alert('Please enter a title for the recording');
    return;
  }

  const blob = previewVideo.recordedBlob;
  if (!blob) {
    alert('No recording available');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = '⏳ Uploading...';

  const formData = new FormData();
  formData.append('video', blob, 'recording.webm');
  formData.append('title', title);
  formData.append('description', descriptionInput.value);

  try {
    const response = await fetch(`${API_URL}/recordings/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    status.textContent = '🎉 Upload successful! Processing will begin shortly.';
    status.className = 'status success';

    // Reset form
    setTimeout(() => {
      preview.style.display = 'none';
      titleInput.value = '';
      descriptionInput.value = '';
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<span class="icon">⬆️</span> Upload & Process';
      timer.textContent = '00:00';
    }, 2000);

  } catch (error) {
    console.error('Upload error:', error);
    status.textContent = '❌ Upload failed: ' + error.message;
    status.className = 'status error';
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span class="icon">⬆️</span> Upload & Process';
  }
}
