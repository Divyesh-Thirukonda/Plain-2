const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`;

const currentUserId = 'user-demo-123'; // In production, this would come from auth

const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const editProfileForm = document.getElementById('editProfileForm');

editProfileBtn.addEventListener('click', () => {
  editProfileModal.style.display = 'flex';
  loadProfileForEdit();
});

editProfileForm.addEventListener('submit', handleProfileUpdate);

// Load user data
loadUserProfile();
loadUserStats();
loadBadges();
loadLeaderboard();

async function loadUserProfile() {
  try {
    const response = await fetch(`${API_URL}/gamification/user/${currentUserId}`);
    const user = await response.json();
    
    document.getElementById('username').textContent = user.username;
    document.getElementById('userRole').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Role not set';
    document.getElementById('levelBadge').textContent = `Lvl ${user.level}`;
    
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadUserStats() {
  try {
    const response = await fetch(`${API_URL}/gamification/user/${currentUserId}/stats`);
    const stats = await response.json();
    
    document.getElementById('totalPoints').textContent = stats.points;
    document.getElementById('ticketsCompleted').textContent = stats.tickets_completed;
    document.getElementById('clipsWatched').textContent = stats.clips_watched;
    document.getElementById('badgesEarned').textContent = stats.badges_earned;
    
    // Update progress bar
    const progress = stats.progress_to_next_level;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${progress} / 100 points to next level`;
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadBadges() {
  try {
    const response = await fetch(`${API_URL}/gamification/user/${currentUserId}`);
    const user = await response.json();
    
    const badgesGrid = document.getElementById('badgesGrid');
    badgesGrid.innerHTML = '';
    
    if (!user.badges || user.badges.length === 0) {
      badgesGrid.innerHTML = '<p class="no-badges">No badges earned yet. Complete tickets and watch clips to earn badges!</p>';
      return;
    }
    
    user.badges.forEach(badge => {
      const badgeCard = document.createElement('div');
      badgeCard.className = 'badge-card';
      badgeCard.innerHTML = `
        <div class="badge-icon-large">${badge.icon}</div>
        <h4>${badge.name}</h4>
        <p class="badge-date">${new Date(badge.earned_at).toLocaleDateString()}</p>
      `;
      badgesGrid.appendChild(badgeCard);
    });
    
  } catch (error) {
    console.error('Error loading badges:', error);
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/gamification/leaderboard`);
    const users = await response.json();
    
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    users.forEach((user, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      
      const listItem = document.createElement('div');
      listItem.className = 'leaderboard-item';
      if (user.id === currentUserId) {
        listItem.classList.add('current-user');
      }
      
      listItem.innerHTML = `
        <div class="rank">${medal}</div>
        <div class="user-info">
          <strong>${user.username}</strong>
          <span>${user.role || 'No role'}</span>
        </div>
        <div class="user-stats">
          <span class="level-badge-small">Lvl ${user.level}</span>
          <span class="points">⭐ ${user.points}</span>
        </div>
      `;
      
      leaderboardList.appendChild(listItem);
    });
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

async function loadProfileForEdit() {
  try {
    const response = await fetch(`${API_URL}/gamification/user/${currentUserId}`);
    const user = await response.json();
    
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editRole').value = user.role || 'frontend';
    
  } catch (error) {
    console.error('Error loading profile for edit:', error);
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const profileData = {
    username: document.getElementById('editUsername').value,
    email: document.getElementById('editEmail').value,
    role: document.getElementById('editRole').value
  };
  
  try {
    await fetch(`${API_URL}/gamification/user/${currentUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    
    editProfileModal.style.display = 'none';
    loadUserProfile();
    
    alert('✅ Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile');
  }
}
