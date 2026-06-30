let currentCollege = null;

async function requireLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('college_name, role')
        .eq('id', session.user.id)
        .single();

    if (profile && profile.role === 'super_admin') {
        window.location.href = 'admin.html';
        return null;
    }

    return profile;
}

const studentForm = document.getElementById('studentForm');
const studentTableBody = document.getElementById('studentTableBody');
const collegeBadge = document.getElementById('collegeBadge');
const logoutBtn = document.getElementById('logoutBtn');

async function loadStudents() {
    try {
        const { data: students, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        renderStudents(students);
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function renderStudents(students) {
    if (!studentTableBody) return;
    studentTableBody.innerHTML = '';

    students.forEach((student) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.roll_no}</td>
            <td>${student.name}</td>
            <td>${student.student_class}</td>
            <td>
                <span class="badge ${student.is_present ? 'badge-present' : 'badge-absent'}" 
                      onclick="toggleAttendance('${student.id}', ${student.is_present})">
                    ${student.is_present ? 'Present' : 'Absent'}
                </span>
            </td>
            <td>
                <button class="actions-btn" onclick="deleteStudent('${student.id}')">Delete</button>
            </td>
        `;
        studentTableBody.appendChild(row);
    });
}

if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rollInput = document.getElementById('studentId');
        const nameInput = document.getElementById('studentName');
        const classInput = document.getElementById('studentClass');

        try {
            const { error } = await supabaseClient
                .from('students')
                .insert([{
                    roll_no: rollInput.value,
                    name: nameInput.value,
                    student_class: classInput.value,
                    is_present: true,
                    college_name: currentCollege
                }]);

            if (error) throw error;
            loadStudents();
            studentForm.reset();
        } catch (err) {
            console.error("Error adding student:", err);
            alert("Error: " + err.message);
        }
    });
}

window.toggleAttendance = async function(id, currentStatus) {
    try {
        const { error } = await supabaseClient
            .from('students')
            .update({ is_present: !currentStatus })
            .eq('id', id);
        if (error) throw error;
        loadStudents();
    } catch (err) {
        console.error("Error toggling attendance:", err);
    }
};

window.deleteStudent = async function(id) {
    if (confirm("Kya aap is student ka record delete karna chahte hain?")) {
        try {
            const { error } = await supabaseClient.from('students').delete().eq('id', id);
            if (error) throw error;
            loadStudents();
        } catch (err) {
            console.error("Error deleting student:", err);
        }
    }
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
}

(async function init() {
    const profile = await requireLogin();
    if (!profile) return;
    currentCollege = profile.college_name;
    if (collegeBadge) collegeBadge.textContent = "College: " + profile.college_name;
    loadStudents();
})();
