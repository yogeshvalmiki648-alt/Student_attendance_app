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
})();
