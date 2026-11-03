const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app');
const state = { students: [], faculty: [], courses: [], departments: [], attendance: null, notices: [] };
let toastTimer;
const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const niceDate = value => value ? new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : 'No date';
const initials = name => String(name || '?').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
const showToast = (message, error = false) => { const el=$('#toast'); el.textContent=message; el.className=`toast show${error?' error':''}`; clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.className='toast',2800); };
async function api(path, options={}) {
  const response=await fetch(`/api/${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}
function setPage(title, view) { $('#page-crumb').textContent=title; $$('.nav-link').forEach(link=>link.classList.toggle('active',link.dataset.view===view)); }
function heading(title, description, action='') { return `<div class="page-heading"><div><div class="eyebrow">CAMPUSDESK · COLLEGE PORTAL</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`; }
function empty(title, description) { return `<div class="empty-state"><b>${title}</b>${description}</div>`; }
function statusPill(status) { return `<span class="status-pill ${String(status).toLowerCase()}">${esc(status)}</span>`; }
function panelHeader(title, subtitle='', link='') { return `<div class="panel-heading"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${link}</div>`; }
const addButton=(label,action='add')=>`<button class="button button-primary" data-action="${action}"><span>＋</span>${label}</button>`;

async function loadCommon() {
  const result=await api('academics'); state.courses=result.courses; state.departments=result.departments;
}
async function render() {
  const view=(location.hash.slice(1).split('?')[0]||'dashboard').toLowerCase();
  try {
    if(view==='students'){setPage('Students','students'); await renderStudents();}
    else if(view==='faculty'){setPage('Faculty','faculty'); await renderFaculty();}
    else if(view==='academics'){setPage('Academics','academics'); await renderAcademics();}
    else if(view==='attendance'){setPage('Attendance','attendance'); await renderAttendance();}
    else if(view==='notices'){setPage('Notices & events','notices'); await renderNotices();}
    else {setPage('Overview','dashboard'); await renderDashboard();}
  } catch(error) { app.innerHTML=heading('A little hiccup','We could not load this page right now.')+`<div class="panel">${empty('Could not load data',esc(error.message))}<div style="text-align:center"><button class="button button-quiet" data-action="refresh">Try again</button></div></div>`; }
}

async function renderDashboard() {
  const data=await api('dashboard');
  const students=await api('students'); state.students=students; $('#student-nav-count').textContent=data.stats.students;
  const cards=[['Students',data.stats.students,'Enrolled across all courses','♙','blue'],['Faculty',data.stats.faculty,'Teaching and academic staff','♧','green'],['Courses',data.stats.courses,'Across '+data.stats.departments+' departments','▤','amber'],['Present today',data.stats.todayPresent,`${data.stats.todayTotal} attendance marks recorded`,'✓','violet']];
  const max=Math.max(1,...data.departments.map(d=>d.students));
  const recent=students.slice(0,5);
  app.innerHTML=heading('Good to see you 👋','Here’s what’s happening across your campus today.',`<button class="button button-quiet" data-action="refresh">↻ &nbsp;Refresh</button>`)+
    `<div class="stats-grid">${cards.map(c=>`<div class="stat-card"><div class="stat-top"><span>${c[0]}</span><span class="stat-icon ${c[4]}">${c[3]}</span></div><div class="stat-number">${c[1]}</div><div class="stat-note">${c[2]}</div></div>`).join('')}</div>`+
    `<div class="dashboard-grid"><section class="panel">${panelHeader('Departments','A quick view of your academic community',`<a href="#academics" class="text-link">View all →</a>`)}<div class="department-list">${data.departments.map((d,i)=>`<div class="department-row"><div class="dept-badge">${esc(d.code)}</div><div><div class="dept-main"><span>${esc(d.name)}</span><span>${d.students} students</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(7,Math.round(d.students/max*100))}%"></div></div></div><div class="dept-meta">${d.faculty} faculty</div></div>`).join('')}</div></section>`+
    `<section class="panel">${panelHeader('Campus bulletin','What’s coming up',`<a href="#notices" class="text-link">See all →</a>`)}<div class="bulletin-list">${data.notices.map((n,i)=>`<div class="bulletin-item"><div class="bulletin-mark">${n.category==='Event'?'✦':n.category==='Academic'?'▤':'↗'}</div><div><strong>${esc(n.title)}</strong><p>${esc(n.body.slice(0,86))}${n.body.length>86?'…':''}</p><time>${esc(n.event_date?niceDate(n.event_date):n.category)}</time></div></div>`).join('')||empty('All quiet for now','New notices will show here.')}</div></section></div>`+
    `<div class="bottom-grid"><section class="panel">${panelHeader('Recently enrolled','A few students from your records',`<a href="#students" class="text-link">All students →</a>`)}${recent.length?`<table class="panel-table"><thead><tr><th>STUDENT</th><th>COURSE</th><th>YEAR</th><th>ROLL NO.</th></tr></thead><tbody>${recent.map((s,i)=>`<tr><td><div class="student-mini"><span class="mini-avatar" style="background:${i%2?'#fff0e3':'#edf1ff'};color:${i%2?'#b97738':'#526bd2'}">${initials(s.name)}</span>${esc(s.name)}</div></td><td>${esc(s.course_code)}</td><td>Year ${s.year}</td><td>${esc(s.roll_no)}</td></tr>`).join('')}</tbody></table>`:empty('No student records yet','Add a student to get started.')}</section>`+
    `<section class="panel">${panelHeader('Quick links','Jump into a common task')}<div class="quick-links"><a class="notice-card-small" href="#students"><div class="notice-date">＋</div><div><strong>Add a student</strong><span>Create a student record</span></div></a><a class="notice-card-small" href="#attendance"><div class="notice-date">✓</div><div><strong>Mark attendance</strong><span>Record today’s class</span></div></a><a class="notice-card-small" href="#notices"><div class="notice-date">↗</div><div><strong>Post an update</strong><span>Share news with campus</span></div></a></div></section></div>`;
}

function personRows(rows, type) {
  if(!rows.length) return `<tr><td colspan="7">${empty(`No ${type} found`,'Try another search or add a new record.')}</td></tr>`;
  return rows.map((p,i)=>`<tr><td><div class="person-cell"><span class="person-avatar ${i%3===1?'warm':''}">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><span>${esc(type==='students'?p.email:p.designation)}</span></div></div></td><td>${esc(type==='students'?p.roll_no:p.employee_id)}</td><td>${esc(type==='students'?p.course_name:p.department_name)}</td><td>${esc(p.email)}</td><td>${esc(p.phone)}</td>${type==='students'?`<td>Year ${p.year}</td>`:`<td>${esc(p.designation)}</td>`}<td><div class="action-group"><button class="action-button" data-action="edit-${type}" data-id="${p.id}">Edit</button><button class="action-button" data-action="delete-${type}" data-id="${p.id}">Delete</button></div></td></tr>`).join('');
}
async function renderStudents() {
  const q=new URLSearchParams(location.hash.split('?')[1]||'').get('q')||''; const rows=await api(`students?q=${encodeURIComponent(q)}`); state.students=rows; $('#student-nav-count').textContent=rows.length;
  app.innerHTML=heading('Student records','Manage enrolments and keep student details up to date.',addButton('Add student'))+
    `<div class="toolbar"><div class="search-wrap"><span>⌕</span><input id="record-search" type="search" value="${esc(q)}" placeholder="Search name, roll number or course…"></div><span class="muted" style="font-size:10px">${rows.length} record${rows.length===1?'':'s'}</span></div>`+
    `<div class="table-card"><table class="data-table"><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>COURSE</th><th>EMAIL</th><th>PHONE</th><th>YEAR</th><th>ACTIONS</th></tr></thead><tbody>${personRows(rows,'students')}</tbody></table><div class="table-footer"><span>Showing ${rows.length} student${rows.length===1?'':'s'}</span><span>CampusDesk records</span></div></div>`;
}
async function renderFaculty() {
  const q=new URLSearchParams(location.hash.split('?')[1]||'').get('q')||'';const rows=await api(`faculty?q=${encodeURIComponent(q)}`);state.faculty=rows;
  app.innerHTML=heading('Faculty directory','A clear view of the people teaching and supporting your students.',addButton('Add faculty'))+
    `<div class="toolbar"><div class="search-wrap"><span>⌕</span><input id="record-search" type="search" value="${esc(q)}" placeholder="Search name, ID or department…"></div><span class="muted" style="font-size:10px">${rows.length} member${rows.length===1?'':'s'}</span></div>`+
    `<div class="table-card"><table class="data-table"><thead><tr><th>FACULTY MEMBER</th><th>EMPLOYEE ID</th><th>DEPARTMENT</th><th>EMAIL</th><th>PHONE</th><th>DESIGNATION</th><th>ACTIONS</th></tr></thead><tbody>${personRows(rows,'faculty')}</tbody></table><div class="table-footer"><span>Showing ${rows.length} faculty member${rows.length===1?'':'s'}</span><span>CampusDesk records</span></div></div>`;
}
async function renderAcademics() {
  await loadCommon();
  app.innerHTML=heading('Academics','Explore the departments and courses offered at your college.')+
    `<div class="academic-grid">${state.departments.map((d,i)=>`<article class="department-card"><div class="department-card-head"><div class="dept-badge">${esc(d.code)}</div><span class="tag">${state.courses.filter(c=>c.department_id===d.id).length} course${state.courses.filter(c=>c.department_id===d.id).length===1?'':'s'}</span></div><h3>${esc(d.name)}</h3><p>Department head · ${esc(d.head)}</p><div class="department-stats"><span><b>${state.students.filter(s=>s.department_name===d.name).length}</b> students</span><span><b>${state.faculty.filter(f=>f.department_id===d.id).length}</b> faculty</span></div></article>`).join('')}</div>`+
    `<h2 class="section-title">Course catalogue <span class="muted" style="font:500 10px 'DM Sans'">· ${state.courses.length} courses</span></h2><div class="course-list">${state.courses.map(c=>`<div class="course-card"><div class="course-icon">▤</div><div><strong>${esc(c.name)}</strong><span>${esc(c.department_name)} · Semester ${c.semester} · ${c.credits} credits</span></div><span class="course-code">${esc(c.code)}</span></div>`).join('')}</div>`;
}
async function renderAttendance() {
  await loadCommon(); const params=new URLSearchParams(location.hash.split('?')[1]||'');const date=params.get('date')||today();const course=Number(params.get('course'))||state.courses[0]?.id||1;
  const data=await api(`attendance?date=${date}&course_id=${course}`);state.attendance=data;
  const present=data.report.present||0,absent=data.report.absent||0,late=data.report.late||0;
  app.innerHTML=heading('Attendance','Take a quick class register and review who was present.',`<div class="attendance-summary"><span class="summary-chip">Present<b>${present}</b></span><span class="summary-chip">Absent<b>${absent}</b></span><span class="summary-chip">Late<b>${late}</b></span></div>`)+
    `<div class="toolbar"><div class="attendance-select"><label for="attendance-course">Course</label><select id="attendance-course">${state.courses.map(c=>`<option value="${c.id}" ${c.id===course?'selected':''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select><label for="attendance-date">Class date</label><input id="attendance-date" type="date" value="${date}"></div><button class="button button-soft" data-action="mark-all">Mark all present</button></div>`+
    `<div class="table-card"><table class="data-table"><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>ATTENDANCE</th></tr></thead><tbody>${data.rows.length?data.rows.map(s=>`<tr><td><div class="person-cell"><span class="person-avatar">${initials(s.name)}</span><div><strong>${esc(s.name)}</strong><span>Student</span></div></div></td><td>${esc(s.roll_no)}</td><td><div class="attendance-row">${statusPill(s.status)}<select class="attendance-status" data-student-id="${s.student_id}" aria-label="Attendance for ${esc(s.name)}"><option ${s.status==='Present'?'selected':''}>Present</option><option ${s.status==='Absent'?'selected':''}>Absent</option><option ${s.status==='Late'?'selected':''}>Late</option></select></div></td></tr>`).join(''):''}${data.rows.length?'':`<tr><td colspan="3">${empty('No students in this course','Choose another course to view its class list.')}</td></tr>`}</tbody></table></div><div class="attendance-bottom"><span>${data.rows.length} students · ${data.report.marked||0} marked</span><button class="button button-primary" data-action="save-attendance">Save attendance</button></div>`;
}
async function renderNotices() {
  const rows=await api('notices');state.notices=rows;
  app.innerHTML=heading('Notices & events','Keep students and faculty in the loop with campus updates.',addButton('Post an update','add-notice'))+
    `<div class="notices-list">${rows.length?rows.map(n=>`<article class="notice-card" data-category="${esc(n.category)}"><div class="notice-symbol">${n.category==='Event'?'✦':n.category==='Academic'?'▤':'↗'}</div><div class="notice-copy"><div class="notice-copy-head"><h3>${esc(n.title)}</h3><span class="tag notice-category ${n.category.toLowerCase()}">${esc(n.category)}</span></div><p>${esc(n.body)}</p><div class="notice-meta"><span>Posted ${niceDate(n.created_at)}</span>${n.event_date?`<span>Event date · ${niceDate(n.event_date)}</span>`:''}</div></div><button class="action-button notice-delete" data-action="delete-notice" data-id="${n.id}">Delete</button></article>`).join(''):empty('No updates posted yet','Share the first announcement with your campus.')}</div>`;
}

const studentSchema=()=>[
  {name:'name',label:'Full name',required:true,placeholder:'e.g. Aditi Sharma'},
  {name:'roll_no',label:'Roll number',required:true,placeholder:'e.g. BCA24007'},
  {name:'email',label:'Email',type:'email',required:true,placeholder:'student@college.edu'},
  {name:'phone',label:'Phone',required:true,placeholder:'10-digit phone number'},
  {name:'gender',label:'Gender',type:'select',options:['Female','Male','Other']},
  {name:'year',label:'Study year',type:'select',options:['1','2','3'],labels:['Year 1','Year 2','Year 3']},
  {name:'course_id',label:'Course',type:'select',options:state.courses.map(c=>String(c.id)),labels:state.courses.map(c=>c.code+' · '+c.name),full:true},
];
const facultySchema=()=>[
  {name:'name',label:'Full name',required:true,placeholder:'e.g. Nisha Kapoor'},
  {name:'employee_id',label:'Employee ID',required:true,placeholder:'e.g. FAC-1003'},
  {name:'email',label:'Work email',type:'email',required:true,placeholder:'name@college.edu'},
  {name:'phone',label:'Phone',required:true,placeholder:'10-digit phone number'},
  {name:'designation',label:'Designation',required:true,placeholder:'e.g. Assistant Professor'},
  {name:'department_id',label:'Department',type:'select',options:state.departments.map(d=>String(d.id)),labels:state.departments.map(d=>d.name),full:true},
];
function openRecordForm(type, record=null) {
  const isStudent=type==='students';const fields=isStudent?studentSchema():facultySchema();
  $('#form-eyebrow').textContent=isStudent?'STUDENT DIRECTORY':'FACULTY DIRECTORY';$('#form-title').textContent=`${record?'Edit':'Add'} ${isStudent?'student':'faculty member'}`;$('#form-submit').textContent=record?'Save changes':`Add ${isStudent?'student':'faculty'}`;
  $('#form-fields').innerHTML=fields.map(f=>`<label class="field ${f.full?'full':''}">${f.label}${f.type==='select'?`<select name="${f.name}" ${f.required?'required':''}>${f.options.map((v,i)=>`<option value="${esc(v)}" ${String(record?.[f.name]??f.options[0])===String(v)?'selected':''}>${esc(f.labels?.[i]??v)}</option>`).join('')}</select>`:`<input name="${f.name}" ${f.type?`type="${f.type}"`:'type="text"'} value="${esc(record?.[f.name]??'')}" placeholder="${esc(f.placeholder||'')}" ${f.required?'required':''}>`}</label>`).join('');
  $('#record-dialog').dataset.type=type;$('#record-dialog').dataset.id=record?.id||'';$('#record-dialog').showModal();
}
function searchSubmit() { const field=$('#record-search');if(!field)return;const value=field.value.trim();const params=new URLSearchParams(location.hash.split('?')[1]||'');if(value)params.set('q',value);else params.delete('q');history.replaceState(null,'',`${location.pathname}${location.search}#${location.hash.slice(1).split('?')[0]}${params.size?'?'+params:''}`);render(); }

document.addEventListener('click',async event=>{
  const close=event.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return;}
  const action=event.target.closest('[data-action]');if(!action)return;
  try {
    if(action.dataset.action==='refresh') await render();
    if(action.dataset.action==='add'){await loadCommon();openRecordForm(location.hash==='#faculty'?'faculty':'students');}
    if(action.dataset.action==='add-notice')$('#notice-dialog').showModal();
    if(action.dataset.action==='edit-students'){await loadCommon();openRecordForm('students',state.students.find(x=>x.id===Number(action.dataset.id)));}
    if(action.dataset.action==='edit-faculty'){await loadCommon();openRecordForm('faculty',state.faculty.find(x=>x.id===Number(action.dataset.id)));}
    if(action.dataset.action==='delete-students'||action.dataset.action==='delete-faculty'){
      const type=action.dataset.action.replace('delete-','');const record=state[type].find(x=>x.id===Number(action.dataset.id));if(!confirm(`Delete ${record?.name||'this record'}? This action cannot be undone.`))return;
      await api(`${type}/${action.dataset.id}`,{method:'DELETE'});showToast(`${type==='students'?'Student':'Faculty member'} deleted.`);await render();
    }
    if(action.dataset.action==='delete-notice'){const record=state.notices.find(x=>x.id===Number(action.dataset.id));if(!confirm(`Delete “${record?.title||'this notice'}”?`))return;await api(`notices/${action.dataset.id}`,{method:'DELETE'});showToast('Update deleted.');await render();}
    if(action.dataset.action==='mark-all')$$('.attendance-status').forEach(select=>{select.value='Present';select.previousElementSibling.className='status-pill present';select.previousElementSibling.textContent='Present';});
    if(action.dataset.action==='save-attendance'){
      const records=$$('.attendance-status').map(s=>({student_id:Number(s.dataset.studentId),status:s.value}));
      await api('attendance',{method:'POST',body:JSON.stringify({course_id:Number($('#attendance-course').value),attendance_date:$('#attendance-date').value,records})});showToast(`Attendance saved for ${records.length} students.`);await render();
    }
  }catch(error){showToast(error.message,true);}
});
$('#record-form').addEventListener('submit',async event=>{
  event.preventDefault();const dialog=$('#record-dialog');const type=dialog.dataset.type;const data=Object.fromEntries(new FormData(event.currentTarget));
  try{await api(`${type}${dialog.dataset.id?'/'+dialog.dataset.id:''}`,{method:dialog.dataset.id?'PUT':'POST',body:JSON.stringify(data)});dialog.close();showToast(`${type==='students'?'Student':'Faculty member'} ${dialog.dataset.id?'updated':'added'}.`);await render();}
  catch(error){showToast(error.message,true);}
});
$('#notice-form').addEventListener('submit',async event=>{
  event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));if(!data.event_date)delete data.event_date;
  try{await api('notices',{method:'POST',body:JSON.stringify(data)});$('#notice-dialog').close();event.currentTarget.reset();showToast('Your update has been posted.');await render();}
  catch(error){showToast(error.message,true);}
});
document.addEventListener('input',event=>{if(event.target.id==='record-search'){clearTimeout(event.target.searchTimer);event.target.searchTimer=setTimeout(searchSubmit,250);}});
document.addEventListener('change',event=>{
  if(event.target.matches('.attendance-status')){const badge=event.target.previousElementSibling;badge.className=`status-pill ${event.target.value.toLowerCase()}`;badge.textContent=event.target.value;}
  if(event.target.id==='attendance-course'||event.target.id==='attendance-date'){const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('course',$('#attendance-course').value);params.set('date',$('#attendance-date').value);history.replaceState(null,'',`${location.pathname}${location.search}#attendance?${params}`);render();}
});
$('#refresh-btn').addEventListener('click',render);
$('#today-label').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
window.addEventListener('hashchange',render);
render();
