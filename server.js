const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'campusdesk.sqlite'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE, head TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
    department_id INTEGER NOT NULL REFERENCES departments(id), semester INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 4
  );
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, roll_no TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL, phone TEXT NOT NULL, gender TEXT NOT NULL,
    year INTEGER NOT NULL, course_id INTEGER NOT NULL REFERENCES courses(id),
    joined_on TEXT NOT NULL DEFAULT (date('now'))
  );
  CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, employee_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL, phone TEXT NOT NULL, designation TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id), joined_on TEXT NOT NULL DEFAULT (date('now'))
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id), attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Present','Absent','Late')),
    UNIQUE(student_id, course_id, attendance_date)
  );
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Announcement','Event','Academic')),
    event_date TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  if (db.prepare('SELECT COUNT(*) AS n FROM departments').get().n) return;
  const department = db.prepare('INSERT INTO departments(name,code,head) VALUES(?,?,?)');
  department.run('Computer Applications', 'BCA', 'Dr. Meera Nair');
  department.run('Commerce & Management', 'BCOM', 'Prof. Arjun Menon');
  department.run('Information Technology', 'BSCIT', 'Dr. Kavita Rao');
  const course = db.prepare('INSERT INTO courses(name,code,department_id,semester,credits) VALUES(?,?,?,?,?)');
  course.run('Bachelor of Computer Applications', 'BCA-01', 1, 1, 4);
  course.run('Bachelor of Commerce', 'BCOM-01', 2, 1, 4);
  course.run('B.Sc. Information Technology', 'BSCIT-01', 3, 1, 4);
  const faculty = db.prepare('INSERT INTO faculty(name,employee_id,email,phone,designation,department_id) VALUES(?,?,?,?,?,?)');
  [
    ['Meera Nair','FAC-1001','meera.nair@campus.edu','9876501001','Head of Department',1],
    ['Rohan Iyer','FAC-1002','rohan.iyer@campus.edu','9876501002','Assistant Professor',1],
    ['Arjun Menon','FAC-2001','arjun.menon@campus.edu','9876502001','Head of Department',2],
    ['Kavita Rao','FAC-3001','kavita.rao@campus.edu','9876503001','Associate Professor',3],
  ].forEach(row => faculty.run(...row));
  const student = db.prepare('INSERT INTO students(name,roll_no,email,phone,gender,year,course_id) VALUES(?,?,?,?,?,?,?)');
  [
    ['Aarav Shah','BCA24001','aarav.shah@student.edu','9876510001','Male',2,1],
    ['Ananya Das','BCA24002','ananya.das@student.edu','9876510002','Female',2,1],
    ['Dev Patel','BCA24003','dev.patel@student.edu','9876510003','Male',2,1],
    ['Isha Kulkarni','BCA24004','isha.kulkarni@student.edu','9876510004','Female',1,1],
    ['Kabir Joshi','BCA24005','kabir.joshi@student.edu','9876510005','Male',1,1],
    ['Maya Thomas','BCOM24001','maya.thomas@student.edu','9876510006','Female',2,2],
    ['Neel Verma','BCOM24002','neel.verma@student.edu','9876510007','Male',1,2],
    ['Priya Nair','BSCIT24001','priya.nair@student.edu','9876510008','Female',2,3],
    ['Rahul Sen','BSCIT24002','rahul.sen@student.edu','9876510009','Male',1,3],
    ['Sara Khan','BCA24006','sara.khan@student.edu','9876510010','Female',3,1],
  ].forEach(row => student.run(...row));
  const today = new Date().toISOString().slice(0, 10);
  const attendance = db.prepare('INSERT INTO attendance(student_id,course_id,attendance_date,status) VALUES(?,?,?,?)');
  [1,2,3,4,5,10].forEach((studentId, i) => attendance.run(studentId, 1, today, ['Present','Present','Absent','Present','Late','Present'][i]));
  const notice = db.prepare('INSERT INTO notices(title,body,category,event_date) VALUES(?,?,?,?)');
  notice.run('Welcome to the new semester', 'Classes for Semester I begin this Monday. Please check your timetable on the department notice board.', 'Announcement', null);
  notice.run('Campus technology showcase', 'Student teams are invited to present their mini projects. Registration is open at the department office.', 'Event', today);
  notice.run('Internal assessment schedule', 'The first internal assessment timetable will be shared by the course coordinators next week.', 'Academic', null);
}
seed();

const all = (sql, ...args) => db.prepare(sql).all(...args);
const one = (sql, ...args) => db.prepare(sql).get(...args);
const run = (sql, ...args) => db.prepare(sql).run(...args);
const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
};
const bad = (message) => Object.assign(new Error(message), { status: 400 });
async function body(req) {
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw bad('Request is too large.'); }
  try { return data ? JSON.parse(data) : {}; } catch { throw bad('Please send valid JSON.'); }
}
const required = (data, fields) => {
  for (const field of fields) if (data[field] === undefined || String(data[field]).trim() === '') throw bad(`${field.replaceAll('_',' ')} is required.`);
};
const positiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw bad('Please choose a valid record.');
  return id;
};
const studentFields = ['name','roll_no','email','phone','gender','year','course_id'];
const facultyFields = ['name','employee_id','email','phone','designation','department_id'];
const studentSelect = `SELECT s.*, c.name AS course_name, c.code AS course_code, d.name AS department_name FROM students s JOIN courses c ON c.id=s.course_id JOIN departments d ON d.id=c.department_id`;
const facultySelect = `SELECT f.*, d.name AS department_name FROM faculty f JOIN departments d ON d.id=f.department_id`;

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const [root, rawId, sub] = parts;
  const id = rawId && Number(rawId);
  if (root === 'dashboard' && req.method === 'GET') {
    const stats = {
      students: one('SELECT COUNT(*) AS n FROM students').n,
      faculty: one('SELECT COUNT(*) AS n FROM faculty').n,
      courses: one('SELECT COUNT(*) AS n FROM courses').n,
      departments: one('SELECT COUNT(*) AS n FROM departments').n,
      todayPresent: one("SELECT COUNT(*) AS n FROM attendance WHERE attendance_date=date('now') AND status='Present'").n,
      todayTotal: one("SELECT COUNT(*) AS n FROM attendance WHERE attendance_date=date('now')").n,
    };
    const departments = all(`SELECT d.id,d.name,d.code,COUNT(DISTINCT s.id) AS students,COUNT(DISTINCT f.id) AS faculty FROM departments d LEFT JOIN courses c ON c.department_id=d.id LEFT JOIN students s ON s.course_id=c.id LEFT JOIN faculty f ON f.department_id=d.id GROUP BY d.id ORDER BY d.name`);
    return json(res, 200, { stats, departments, notices: all('SELECT * FROM notices ORDER BY COALESCE(event_date, substr(created_at,1,10)) ASC, id DESC LIMIT 4') });
  }
  if (root === 'students') {
    if (req.method === 'GET') return json(res, 200, all(`${studentSelect} WHERE (?='' OR s.name LIKE ? OR s.roll_no LIKE ? OR c.name LIKE ?) ORDER BY s.name`, url.searchParams.get('q') || '', `%${url.searchParams.get('q') || ''}%`, `%${url.searchParams.get('q') || ''}%`, `%${url.searchParams.get('q') || ''}%`));
    if (req.method === 'POST') { const x=await body(req); required(x,studentFields); run('INSERT INTO students(name,roll_no,email,phone,gender,year,course_id) VALUES(?,?,?,?,?,?,?)',x.name.trim(),x.roll_no.trim(),x.email.trim(),x.phone.trim(),x.gender,positiveId(x.year),positiveId(x.course_id)); return json(res,201,{ok:true}); }
    if (id && req.method === 'PUT') { const x=await body(req); required(x,studentFields); run('UPDATE students SET name=?,roll_no=?,email=?,phone=?,gender=?,year=?,course_id=? WHERE id=?',x.name.trim(),x.roll_no.trim(),x.email.trim(),x.phone.trim(),x.gender,positiveId(x.year),positiveId(x.course_id),positiveId(id)); return json(res,200,{ok:true}); }
    if (id && req.method === 'DELETE') { run('DELETE FROM students WHERE id=?',positiveId(id)); return json(res,200,{ok:true}); }
  }
  if (root === 'faculty') {
    if (req.method === 'GET') return json(res,200,all(`${facultySelect} WHERE (?='' OR f.name LIKE ? OR f.employee_id LIKE ? OR d.name LIKE ?) ORDER BY f.name`,url.searchParams.get('q')||'',`%${url.searchParams.get('q')||''}%`,`%${url.searchParams.get('q')||''}%`,`%${url.searchParams.get('q')||''}%`));
    if (req.method === 'POST') { const x=await body(req); required(x,facultyFields); run('INSERT INTO faculty(name,employee_id,email,phone,designation,department_id) VALUES(?,?,?,?,?,?)',x.name.trim(),x.employee_id.trim(),x.email.trim(),x.phone.trim(),x.designation.trim(),positiveId(x.department_id)); return json(res,201,{ok:true}); }
    if (id && req.method === 'PUT') { const x=await body(req); required(x,facultyFields); run('UPDATE faculty SET name=?,employee_id=?,email=?,phone=?,designation=?,department_id=? WHERE id=?',x.name.trim(),x.employee_id.trim(),x.email.trim(),x.phone.trim(),x.designation.trim(),positiveId(x.department_id),positiveId(id)); return json(res,200,{ok:true}); }
    if (id && req.method === 'DELETE') { run('DELETE FROM faculty WHERE id=?',positiveId(id)); return json(res,200,{ok:true}); }
  }
  if (root === 'academics' && req.method === 'GET') return json(res,200,{departments:all('SELECT * FROM departments ORDER BY name'),courses:all('SELECT c.*,d.name AS department_name,d.code AS department_code FROM courses c JOIN departments d ON d.id=c.department_id ORDER BY d.name,c.name')});
  if (root === 'attendance') {
    if (req.method === 'GET') {
      const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10), courseId=Number(url.searchParams.get('course_id'))||1;
      const rows=all(`SELECT s.id AS student_id,s.roll_no,s.name,COALESCE(a.status,'Unmarked') AS status FROM students s LEFT JOIN attendance a ON a.student_id=s.id AND a.course_id=? AND a.attendance_date=? WHERE s.course_id=? ORDER BY s.roll_no`,courseId,date,courseId);
      const report=one(`SELECT COUNT(a.id) AS marked,SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) AS present,SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END) AS absent,SUM(CASE WHEN a.status='Late' THEN 1 ELSE 0 END) AS late FROM students s LEFT JOIN attendance a ON a.student_id=s.id AND a.course_id=? AND a.attendance_date=? WHERE s.course_id=?`,courseId,date,courseId);
      return json(res,200,{date,courseId,rows,report});
    }
    if (req.method === 'POST') {
      const x=await body(req); required(x,['attendance_date','course_id','records']);
      if (!Array.isArray(x.records)) throw bad('Attendance records must be a list.');
      const save=db.prepare(`INSERT INTO attendance(student_id,course_id,attendance_date,status) VALUES(?,?,?,?) ON CONFLICT(student_id,course_id,attendance_date) DO UPDATE SET status=excluded.status`);
      db.exec('BEGIN');
      try { for(const r of x.records){ if(!['Present','Absent','Late'].includes(r.status)) throw bad('Each status must be Present, Absent, or Late.'); const studentId=positiveId(r.student_id),courseId=positiveId(x.course_id); const student=one('SELECT course_id FROM students WHERE id=?',studentId); if(!student||student.course_id!==courseId) throw bad('A student can only be marked for their enrolled course.'); save.run(studentId,courseId,x.attendance_date,r.status); } db.exec('COMMIT'); }
      catch(e){db.exec('ROLLBACK'); throw e;}
      return json(res,200,{ok:true,saved:x.records.length});
    }
  }
  if (root === 'notices') {
    if (req.method === 'GET') return json(res,200,all('SELECT * FROM notices ORDER BY COALESCE(event_date,substr(created_at,1,10)) ASC,id DESC'));
    if (req.method === 'POST') { const x=await body(req); required(x,['title','body','category']); if(!['Announcement','Event','Academic'].includes(x.category)) throw bad('Choose a valid category.'); run('INSERT INTO notices(title,body,category,event_date) VALUES(?,?,?,?)',x.title.trim(),x.body.trim(),x.category,x.event_date||null); return json(res,201,{ok:true}); }
    if (id && req.method === 'DELETE') { run('DELETE FROM notices WHERE id=?',positiveId(id)); return json(res,200,{ok:true}); }
  }
  return json(res,404,{error:'That page or action was not found.'});
}

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon' };
const server = http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')) { try { await handleApi(req,res,{pathname:url.pathname.slice(5),searchParams:url.searchParams}); } catch(e) { const status=e.status||((e.code==='SQLITE_CONSTRAINT_UNIQUE'||e.code==='SQLITE_CONSTRAINT_PRIMARYKEY')?409:500); json(res,status,{error:status===409?'That ID or email is already in use.':status===500?'Something went wrong. Please check the server output.':e.message}); if(status===500) console.error(e); } return; }
  const requestPath=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(PUBLIC,requestPath);
  if(!file.startsWith(PUBLIC+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file,(error,content)=>{ if(error){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Page not found');return;} res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content); });
});
server.listen(PORT,()=>console.log(`CampusDesk is ready at http://localhost:${PORT}`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{server.close(()=>{db.close();process.exit(0);});});
