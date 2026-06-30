let currentUserId = null;

async function requireLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

    if (profile && profile.role === 'super_admin') {
        window.location.href = 'admin.html';
        return null;
    }

    return session.user;
}

const welcomeText = document.getElementById('welcomeText');
const infoRoll = document.getElementById('infoRoll');
const infoName = document.getElementById('infoName');
const infoCourse = document.getElementById('infoCourse');
const infoPhone = document.getElementById('infoPhone');
const infoEmail = document.getElementById('infoEmail');
const markBtn = document.getElementById('markBtn');
const statusMsg = document.getElementById('statusMsg');
const attendanceBody = document.getElementById('attendanceBody');
const logoutBtn = document.getElementById('logoutBtn');
const noticesList = document.getElementById('noticesList');
const documentsList = document.getElementById('documentsList');

async function loadMyDetails() {
    const { data: student, error } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', currentUserId)
        .single();

    if (error || !student) {
        statusMsg.textContent = "Could not load your details.";
        statusMsg.className = 'status-msg status-info';
        return;
    }

    welcomeText.textContent = "Welcome, " + student.name;
    infoRoll.textContent = student.roll_no;
    infoName.textContent = student.name;
    infoCourse.textContent = student.course;
    infoPhone.textContent = student.phone || '-';
    infoEmail.textContent = student.email || '-';
}

async function loadAttendanceHistory() {
    const { data, error } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('student_id', currentUserId)
        .order('marked_date', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    attendanceBody.innerHTML = '';
    data.forEach((row) => {
        const tr = document.createElement('tr');
        const time = new Date(row.marked_at).toLocaleTimeString();
        tr.innerHTML = `<td>${row.marked_date}</td><td>${time}</td>`;
        attendanceBody.appendChild(tr);
    });

    const today = new Date().toISOString().slice(0, 10);
    const alreadyMarkedToday = data.some(row => row.marked_date === today);
    if (alreadyMarkedToday) {
        markBtn.disabled = true;
        statusMsg.textContent = "Attendance already marked for today.";
        statusMsg.className = 'status-msg status-info';
    }
}

async function loadNotices() {
    if (!noticesList) return;
    const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        noticesList.innerHTML = '<p class="empty-msg">Could not load notices.</p>';
        return;
    }

    if (!data || data.length === 0) {
        noticesList.innerHTML = '<p class="empty-msg">No notices yet.</p>';
        return;
    }

    noticesList.innerHTML = '';
    data.forEach(n => {
        const date = new Date(n.created_at).toLocaleString();
        const div = document.createElement('div');
        div.className = 'notice-item';
        div.innerHTML = `
            <div class="notice-title">${n.title}</div>
            <div>${n.content}</div>
            <div class="notice-meta">${date}</div>
        `;
        noticesList.appendChild(div);
    });
}

async function loadDocuments() {
    if (!documentsList) return;
    const { data, error } = await supabaseClient.storage.from('documents').list('', {
        sortBy: { column: 'created_at', order: 'desc' }
    });

    if (error) {
        documentsList.innerHTML = '<p class="empty-msg">Could not load documents.</p>';
        return;
    }

    const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');

    if (files.length === 0) {
        documentsList.innerHTML = '<p class="empty-msg">No documents available yet.</p>';
        return;
    }

    documentsList.innerHTML = '';
    files.forEach(file => {
        const { data: urlData } = supabaseClient.storage.from('documents').getPublicUrl(file.name);
        const div = document.createElement('div');
        div.className = 'doc-item';
        div.innerHTML = `
            <span>${file.name}</span>
            <a class="doc-link" href="${urlData.publicUrl}" target="_blank" rel="noopener noreferrer">Download</a>
        `;
        documentsList.appendChild(div);
    });
}

if (markBtn) {
    markBtn.addEventListener('click', async () => {
        markBtn.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('attendance')
                .insert([{ student_id: currentUserId }]);

            if (error) {
                if (error.code === '23505') {
                    statusMsg.textContent = "Attendance already marked for today.";
                    statusMsg.className = 'status-msg status-info';
                } else {
                    statusMsg.textContent = "Error: " + error.message;
                    statusMsg.className = 'status-msg status-info';
                    markBtn.disabled = false;
                }
                return;
            }

            statusMsg.textContent = "Attendance marked successfully!";
            statusMsg.className = 'status-msg status-success';
            loadAttendanceHistory();
        } catch (err) {
            console.error(err);
            markBtn.disabled = false;
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
}

(async function init() {
    const user = await requireLogin();
    if (!user) return;
    currentUserId = user.id;
    await loadMyDetails();
    await loadAttendanceHistory();
    await loadNotices();
    await loadDocuments();
})();
