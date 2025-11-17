const API_URL = 'http://localhost:3000/api';
let allClips = [];
let filteredClips = [];
let currentRole = 'all';
let currentClipIndex = 0;

const clipsFeed = document.getElementById('clipsFeed');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterChips = document.querySelectorAll('.chip');
const clipModal = document.getElementById('clipModal');
const closeModal = document.getElementById('closeModal');
const modalVideo = document.getElementById('modalVideo');
const prevClipBtn = document.getElementById('prevClip');
const nextClipBtn = document.getElementById('nextClip');
const likeBtn = document.getElementById('likeBtn');

// Load clips on page load
loadClips();

// Event listeners
searchInput.addEventListener('input', handleSearch);
filterChips.forEach(chip => {
  chip.addEventListener('click', () => handleRoleFilter(chip.dataset.role));
});
closeModal.addEventListener('click', closeClipModal);
prevClipBtn.addEventListener('click', showPreviousClip);
nextClipBtn.addEventListener('click', showNextClip);
likeBtn.addEventListener('click', likeCurrentClip);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (clipModal.style.display === 'flex') {
    if (e.key === 'ArrowLeft') showPreviousClip();
    if (e.key === 'ArrowRight') showNextClip();
    if (e.key === 'Escape') closeClipModal();
  }
});

async function loadClips() {
  loading.style.display = 'block';
  clipsFeed.innerHTML = '';
  emptyState.style.display = 'none';

  try {
    const params = new URLSearchParams();
    if (currentRole !== 'all') params.append('role', currentRole);
    
    const response = await fetch(`${API_URL}/clips?${params}`);
    allClips = await response.json();
    filteredClips = allClips;
    
    displayClips(filteredClips);
  } catch (error) {
    console.error('Error loading clips:', error);
    emptyState.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function displayClips(clips) {
  clipsFeed.innerHTML = '';
  
  if (clips.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  clips.forEach((clip, index) => {
    const clipCard = createClipCard(clip, index);
    clipsFeed.appendChild(clipCard);
  });
}

function createClipCard(clip, index) {
  const card = document.createElement('div');
  card.className = 'clip-card';
  card.onclick = () => openClipModal(index);

  const thumbnail = document.createElement('div');
  thumbnail.className = 'clip-thumbnail';
  thumbnail.innerHTML = `
    <video src="${clip.file_path.replace('./uploads', 'http://localhost:3000/uploads')}" 
           onmouseover="this.play()" 
           onmouseout="this.pause(); this.currentTime=0;" 
           muted>
    </video>
    <div class="clip-duration">${formatDuration(clip.end_time - clip.start_time)}</div>
  `;

  const info = document.createElement('div');
  info.className = 'clip-card-info';
  info.innerHTML = `
    <h4>${clip.title}</h4>
    <div class="clip-meta">
      <span class="role-badge">${clip.role}</span>
      <span class="views">👁️ ${clip.views}</span>
      <span class="likes">❤️ ${clip.likes}</span>
    </div>
    <div class="clip-tags-preview">
      ${clip.tags.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
    </div>
  `;

  card.appendChild(thumbnail);
  card.appendChild(info);
  return card;
}

function handleRoleFilter(role) {
  currentRole = role;
  
  filterChips.forEach(chip => chip.classList.remove('active'));
  event.target.classList.add('active');
  
  loadClips();
}

function handleSearch() {
  const query = searchInput.value.toLowerCase();
  
  if (!query) {
    filteredClips = allClips;
  } else {
    filteredClips = allClips.filter(clip => 
      clip.title.toLowerCase().includes(query) ||
      clip.transcript.toLowerCase().includes(query) ||
      clip.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  displayClips(filteredClips);
}

function openClipModal(index) {
  currentClipIndex = index;
  const clip = filteredClips[index];
  
  clipModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  displayClipInModal(clip);
  
  // Track view
  fetch(`${API_URL}/clips/${clip.id}/view`, { method: 'POST' })
    .catch(err => console.error('Error tracking view:', err));
}

function closeClipModal() {
  clipModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  modalVideo.pause();
}

function displayClipInModal(clip) {
  modalVideo.src = clip.file_path.replace('./uploads', 'http://localhost:3000/uploads');
  modalVideo.load();
  
  document.getElementById('clipTitle').textContent = clip.title;
  document.getElementById('clipTranscript').textContent = clip.transcript || 'No transcript available';
  document.getElementById('viewCount').textContent = clip.views;
  document.getElementById('likeCount').textContent = clip.likes;
  
  const tagsContainer = document.getElementById('clipTags');
  tagsContainer.innerHTML = clip.tags.map(tag => 
    `<span class="tag">#${tag}</span>`
  ).join('');
  
  // Update navigation buttons
  prevClipBtn.disabled = currentClipIndex === 0;
  nextClipBtn.disabled = currentClipIndex === filteredClips.length - 1;
}

function showPreviousClip() {
  if (currentClipIndex > 0) {
    currentClipIndex--;
    displayClipInModal(filteredClips[currentClipIndex]);
  }
}

function showNextClip() {
  if (currentClipIndex < filteredClips.length - 1) {
    currentClipIndex++;
    displayClipInModal(filteredClips[currentClipIndex]);
  }
}

async function likeCurrentClip() {
  const clip = filteredClips[currentClipIndex];
  
  try {
    await fetch(`${API_URL}/clips/${clip.id}/like`, { method: 'POST' });
    
    clip.likes++;
    document.getElementById('likeCount').textContent = clip.likes;
    
    likeBtn.classList.add('liked');
    setTimeout(() => likeBtn.classList.remove('liked'), 500);
  } catch (error) {
    console.error('Error liking clip:', error);
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
