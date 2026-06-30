const API_URL = window.location.origin + '/api/students';

const studentForm = document.getElementById('studentForm');
const studentTableBody = document.getElementById('studentTableBody');

async function loadStudents() {
    try {
        const response = await fetch(API_URL);
        const students = await response.json();
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
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roll_no: rollInput.value,
                    name: nameInput.value,
                    student_class: classInput.value
                })
            });
            loadStudents();
            studentForm.reset();
        } catch (err) {
            console.error("Error adding student:", err);
        }
    });
}

window.toggleAttendance = async function(id, currentStatus) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_present: !currentStatus })
        });
        loadStudents();
    } catch (err) {
        console.error("Error toggling attendance:", err);
    }
};

window.deleteStudent = async function(id) {
    if(confirm("Kya aap is student ka record delete karna chahte hain?")) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            loadStudents();
        } catch (err) {
            console.error("Error deleting student:", err);
        }
    }
};

loadStudents();
