/* Demo data loader. WARNING: wipes every collection in the configured database.
   Usage:  npm run seed          (refuses to run when NODE_ENV=production) */
const mongoose = require('mongoose');
const env = require('../config/env');
const M = require('../models');
const { toDay, todayStr } = require('./helpers');
const allocationService = require('../services/allocation.service');
const billingService = require('../services/billing.service');

// Small deterministic PRNG so every seed run produces the same demo data.
let seedState = 42;
const rnd = () => { seedState = (seedState * 1664525 + 1013904223) % 4294967296; return seedState / 4294967296; };
const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

const DEMO = { admin: 'Admin@123', warden: 'Warden@123', mess: 'Mess@123', student: 'Student@123' };

const MENUS = [
  { breakfast: ['Idly', 'Sambar', 'Coconut chutney'], lunch: ['Rice', 'Sambar', 'Beans poriyal', 'Curd'], snacks: ['Tea', 'Biscuits'], dinner: ['Chapati', 'Vegetable kurma'] },
  { breakfast: ['Pongal', 'Vadai', 'Sambar'], lunch: ['Rice', 'Rasam', 'Cabbage poriyal', 'Appalam'], snacks: ['Coffee', 'Sundal'], dinner: ['Dosai', 'Tomato chutney', 'Sambar'] },
  { breakfast: ['Poori', 'Potato masala'], lunch: ['Lemon rice', 'Potato fry', 'Curd'], snacks: ['Tea', 'Bonda'], dinner: ['Parotta', 'Salna'] },
  { breakfast: ['Upma', 'Coconut chutney'], lunch: ['Rice', 'Kootu', 'Carrot poriyal', 'Buttermilk'], snacks: ['Coffee', 'Murukku'], dinner: ['Idiyappam', 'Kurma'] },
  { breakfast: ['Idly', 'Podi', 'Sambar'], lunch: ['Vegetable biriyani', 'Raita', 'Boiled egg'], snacks: ['Tea', 'Banana'], dinner: ['Chapati', 'Dal fry'] },
  { breakfast: ['Dosai', 'Chutney'], lunch: ['Rice', 'Vatha kuzhambu', 'Beetroot poriyal', 'Curd'], snacks: ['Milk', 'Biscuits'], dinner: ['Fried rice', 'Gobi manchurian'] },
  { breakfast: ['Aappam', 'Vegetable stew'], lunch: ['Sambar rice', 'Potato roast', 'Payasam'], snacks: ['Tea', 'Samosa'], dinner: ['Chapati', 'Paneer butter masala'] },
];

const NAMES = [
  ['Arun Kumar', 'male', 'Computer Science', 3], ['Karthik Raja', 'male', 'Mechanical', 2], ['Vignesh S', 'male', 'Electronics', 4],
  ['Harish Balaji', 'male', 'Information Technology', 1], ['Manoj Prabhu', 'male', 'Civil', 3], ['Suresh Babu', 'male', 'Electrical', 2],
  ['Naveen Chandran', 'male', 'Computer Science', 1], ['Dinesh Kumar', 'male', 'Mechanical', 4], ['Praveen Raj', 'male', 'Biotechnology', 2],
  ['Ganesh Moorthy', 'male', 'Information Technology', 3], ['Ashwin Narayanan', 'male', 'Computer Science', 2], ['Rohit Sharma', 'male', 'Management', 1],
  ['Sanjay Venkat', 'male', 'Electronics', 3], ['Lokesh Pandian', 'male', 'Civil', 1],
  ['Priya Dharshini', 'female', 'Computer Science', 3], ['Divya Bharathi', 'female', 'Information Technology', 2], ['Kavya Sri', 'female', 'Biotechnology', 1],
  ['Meena Kumari', 'female', 'Electronics', 4], ['Nandhini R', 'female', 'Mechanical', 2], ['Swathi Lakshmi', 'female', 'Computer Science', 4],
  ['Anitha Rani', 'female', 'Civil', 3], ['Harini Sundar', 'female', 'Management', 1], ['Pavithra M', 'female', 'Electrical', 2], ['Sowmya Devi', 'female', 'Information Technology', 1],
];
const CODES = { 'Computer Science': 'CS', 'Information Technology': 'IT', Electronics: 'EC', Mechanical: 'ME', Civil: 'CE', Electrical: 'EE', Biotechnology: 'BT', Management: 'MB' };

async function run() {
  if (env.isProd) { console.error('Refusing to seed while NODE_ENV=production.'); process.exit(1); }
  await mongoose.connect(env.mongoUri);
  console.log(`Seeding ${mongoose.connection.name} ...`);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(M).map((m) => m.init()));

  // ---- Structure ----
  const kaveri = await M.Hostel.create({ name: 'Kaveri Boys Hostel', type: 'boys', address: 'North Campus, College Road', contactPhone: '9840011001' });
  const vaigai = await M.Hostel.create({ name: 'Vaigai Girls Hostel', type: 'girls', address: 'South Campus, College Road', contactPhone: '9840011002' });
  const kA = await M.Block.create({ hostel: kaveri._id, name: 'Block A', floors: 3 });
  const kB = await M.Block.create({ hostel: kaveri._id, name: 'Block B', floors: 2 });
  const vA = await M.Block.create({ hostel: vaigai._id, name: 'Block A', floors: 3 });

  const roomDefs = [];
  for (const [hostel, block, prefix, floors, perFloor] of [[kaveri, kA, 'A', 3, 4], [kaveri, kB, 'B', 2, 3], [vaigai, vA, 'A', 3, 4]]) {
    for (let f = 1; f <= floors; f++) for (let n = 1; n <= perFloor; n++) {
      roomDefs.push({ hostel: hostel._id, block: block._id, roomNumber: `${prefix}-${f}0${n}`, floor: f, capacity: n % 2 ? 3 : 4, roomType: n === 4 ? 'ac' : 'standard' });
    }
  }
  roomDefs[5].status = 'maintenance'; // one room under maintenance for the demo
  const rooms = await M.Room.insertMany(roomDefs);

  const kMess = await M.Mess.create({ name: 'Kaveri Mess', location: 'Ground floor, Kaveri Hostel', hostels: [kaveri._id] });
  const vMess = await M.Mess.create({ name: 'Vaigai Mess', location: 'Ground floor, Vaigai Hostel', hostels: [vaigai._id] });

  // ---- Staff ----
  const admin = await M.User.create({ name: 'Dr. Ramesh Iyer', email: 'admin@hostel.edu', password: DEMO.admin, role: 'admin', phone: '9840000001' });
  const warden = await M.User.create({ name: 'Mr. Selvam Murugan', email: 'warden@hostel.edu', password: DEMO.warden, role: 'warden', assignedHostels: [kaveri._id], phone: '9840000002', createdBy: admin._id });
  const warden2 = await M.User.create({ name: 'Mrs. Lakshmi Narayanan', email: 'warden2@hostel.edu', password: DEMO.warden, role: 'warden', assignedHostels: [vaigai._id], phone: '9840000003', createdBy: admin._id });
  const manager = await M.User.create({ name: 'Mr. Palani Velu', email: 'mess@hostel.edu', password: DEMO.mess, role: 'mess_manager', assignedMesses: [kMess._id, vMess._id], phone: '9840000004', createdBy: admin._id });

  // ---- Students ----
  const students = [];
  const today = toDay(todayStr());
  for (let i = 0; i < NAMES.length; i++) {
    const [name, gender, department, year] = NAMES[i];
    const email = `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@student.edu`;
    const user = await M.User.create({ name, email, password: DEMO.student, role: 'student', phone: `98400${20000 + i}` });
    const s = await M.Student.create({
      user: user._id, studentId: `${String(26 - year).padStart(2, '0')}${CODES[department]}${String(i + 1).padStart(3, '0')}`,
      name, email, phone: user.phone, gender, department, year, section: pickOne(['A', 'B']),
      dob: new Date(Date.UTC(2007 - year, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27))),
      guardianName: `${name.split(' ')[0]}'s Parent`, guardianPhone: `94430${10000 + i}`, emergencyContact: `94430${10000 + i}`,
      address: `${10 + i}, Gandhi Street, ${pickOne(['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy'])}, Tamil Nadu`,
      mess: gender === 'male' ? kMess._id : vMess._id, admissionDate: new Date(Date.UTC(2026 - year, 5, 15)), createdBy: admin._id,
    });
    students.push(s);
  }

  // ---- Allocations (through the real service so the same rules apply) ----
  const boys = students.filter((s) => s.gender === 'male');
  const girls = students.filter((s) => s.gender === 'female');
  const kRooms = rooms.filter((r) => String(r.hostel) === String(kaveri._id) && r.status === 'available');
  const vRooms = rooms.filter((r) => String(r.hostel) === String(vaigai._id) && r.status === 'available');
  const place = async (list, roomList, actor, skipLast) => {
    let ri = 0; let bed = 1;
    for (const s of list.slice(0, list.length - skipLast)) {
      const room = roomList[ri];
      await allocationService.allocate({ studentId: s._id, roomId: room._id, bedNumber: bed, actor });
      bed += 1;
      if (bed > room.capacity) { ri += 1; bed = 1; }
    }
  };
  await place(boys, kRooms, warden, 1);   // last boy left unallocated: a new admission
  await place(girls, vRooms, warden2, 0);
  // Show one room change in the history.
  await allocationService.transfer({ studentId: boys[0]._id, roomId: kRooms[kRooms.length - 1]._id, bedNumber: 1, remarks: 'Requested a quieter floor', actor: warden });

  // ---- Menus: two weeks around today ----
  const menuDocs = [];
  for (const mess of [kMess, vMess]) for (let d = -14; d <= 7; d++) {
    const date = addDays(today, d);
    menuDocs.push({ mess: mess._id, date, meals: MENUS[((date.getUTCDate() + d + 70) % 7 + 7) % 7], createdBy: manager._id, updatedBy: manager._id });
  }
  await M.MessMenu.insertMany(menuDocs);

  // ---- Attendance from the 1st of last month until yesterday-ish ----
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const attendance = [];
  for (const s of students) {
    for (let d = new Date(monthStart); d <= today; d = addDays(d, 1)) {
      for (const meal of ['breakfast', 'lunch', 'snacks', 'dinner']) {
        const p = { breakfast: 0.8, lunch: 0.92, snacks: 0.5, dinner: 0.88 }[meal];
        if (d.getTime() === today.getTime() && meal !== 'breakfast') continue; // today's later meals are not served yet
        attendance.push({ student: s._id, mess: s.mess, date: new Date(d), mealType: meal, status: rnd() < p ? 'present' : 'absent', recordedBy: manager._id });
      }
    }
  }
  await M.MealAttendance.insertMany(attendance);

  // ---- Bills for last month, with a mix of payment outcomes ----
  const lastMonth = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
  const due = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 10));
  const dueStr = due.toISOString().slice(0, 10);
  for (const mess of [kMess, vMess]) await billingService.generateBills({ messId: mess._id, month: lastMonth, dueDate: dueStr, otherCharges: 150, actor: manager });
  const bills = await M.MessBill.find({ month: lastMonth });
  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    if (i % 3 === 0) await billingService.recordPayment({ bill: b, amount: b.finalAmount, method: pickOne(['upi', 'cash']), reference: `REF${1000 + i}`, actor: manager });
    else if (i % 3 === 1) await billingService.recordPayment({ bill: b, amount: Math.floor(b.finalAmount / 2), method: 'cash', actor: manager });
  }
  await billingService.refreshOverdue();

  // ---- Feedback ----
  const feedback = [];
  for (const s of students.slice(0, 18)) for (let d = 1; d <= 6; d++) {
    const meal = pickOne(['breakfast', 'lunch', 'dinner']);
    feedback.push({ student: s._id, mess: s.mess, date: addDays(today, -d), mealType: meal, rating: Math.min(5, Math.max(1, Math.round(3.6 + (rnd() - 0.5) * 3))), comment: rnd() < 0.3 ? pickOne(['Tasty and hot', 'Sambar was watery', 'Good variety today', 'Rice was undercooked', 'Loved the kurma']) : undefined });
  }
  await M.MessFeedback.insertMany(feedback, { ordered: false }).catch(() => {}); // ignore random duplicate keys

  // ---- Complaints ----
  const cs = [
    [0, 'electrical', 'Fan making noise', 'The ceiling fan in my room makes a loud noise at night.', 'medium', 'pending'],
    [1, 'water', 'No water on the second floor', 'There has been no water supply since morning.', 'high', 'in_progress'],
    [2, 'internet', 'Wi-Fi is very slow', 'Wi-Fi speed drops below 1 Mbps every evening.', 'low', 'resolved'],
    [3, 'food', 'Undercooked rice at lunch', 'Rice served at lunch was undercooked on Monday.', 'medium', 'pending'],
    [4, 'cleaning', 'Bathroom not cleaned', 'Common bathroom on my floor has not been cleaned for 3 days.', 'medium', 'in_progress'],
    [14, 'plumbing', 'Leaking tap', 'The tap in the wash area keeps leaking.', 'medium', 'pending'],
    [15, 'security', 'Main gate light not working', 'The light near the entrance is out, making it unsafe after 8 pm.', 'urgent', 'in_progress'],
    [16, 'food', 'Less variety in snacks', 'Snacks are the same four days a week.', 'low', 'rejected'],
  ];
  for (const [idx, category, title, description, priority, status] of cs) {
    const s = students[idx];
    const alloc = await M.RoomAllocation.findOne({ student: s._id, status: 'active' });
    const staff = category === 'food' ? manager : (s.gender === 'male' ? warden : warden2);
    const history = [{ status: 'pending', note: 'Complaint submitted', by: s.user, at: addDays(new Date(), -5) }];
    if (status !== 'pending') history.push({ status, note: status === 'resolved' ? 'Router replaced' : status === 'rejected' ? 'Menu is fixed by the mess committee' : 'Assigned for action', by: staff._id, at: addDays(new Date(), -2) });
    await M.Complaint.create({
      student: s._id, hostel: alloc?.hostel, mess: s.mess, category, title, description, priority, status,
      assignedTo: status === 'pending' ? undefined : staff._id,
      resolution: status === 'resolved' ? 'Router replaced and speeds verified.' : status === 'rejected' ? 'The weekly menu is decided by the mess committee. Suggestion forwarded.' : undefined,
      statusHistory: history, createdBy: s.user,
    });
  }

  // ---- Leaves ----
  const leaveRows = [
    [0, 3, 6, 'Family function', 'Madurai', 'pending'], [1, 5, 9, 'Sister\'s wedding', 'Salem', 'pending'],
    [2, -10, -6, 'Medical treatment', 'Chennai', 'approved'], [4, -3, 1, 'Festival at home', 'Trichy', 'approved'],
    [5, 2, 3, 'Interview', 'Bengaluru', 'rejected'], [14, 4, 8, 'Family visit', 'Coimbatore', 'pending'], [15, 7, 10, 'Cousin\'s engagement', 'Erode', 'pending'],
  ];
  for (const [idx, from, to, reason, destination, status] of leaveRows) {
    const s = students[idx];
    const alloc = await M.RoomAllocation.findOne({ student: s._id, status: 'active' });
    const decider = s.gender === 'male' ? warden : warden2;
    await M.LeaveRequest.create({
      student: s._id, hostel: alloc?.hostel, startDate: addDays(today, from), endDate: addDays(today, to), reason, destination, contact: s.guardianPhone, status,
      remarks: status === 'rejected' ? 'Internal exams on those dates. Reapply after the schedule ends.' : status === 'approved' ? 'Approved. Return by the end date.' : undefined,
      decidedBy: status === 'pending' ? undefined : decider._id, decidedAt: status === 'pending' ? undefined : addDays(new Date(), -1), createdBy: s.user,
    });
  }

  // ---- Notices ----
  const notices = [
    { title: 'Hostel day-out timings revised', description: 'From next week, the evening entry cut-off will be 8:30 pm on weekdays. Late entry requires prior permission from the warden.', category: 'hostel', audience: { type: 'hostel', hostel: kaveri._id }, publishedBy: warden._id },
    { title: 'Water tank cleaning on Sunday', description: 'Water supply will be interrupted from 9 am to 1 pm this Sunday for tank cleaning. Please store water in advance.', category: 'maintenance', audience: { type: 'hostel', hostel: vaigai._id }, publishedBy: warden2._id },
    { title: 'Mess special dinner this Friday', description: 'A special dinner with biriyani and payasam will be served this Friday at 7:30 pm in both messes.', category: 'mess', audience: { type: 'all' }, publishedBy: admin._id },
    { title: 'Mess fee payment reminder', description: `Mess bills for ${lastMonth} are due on ${dueStr}. Please contact the mess office to record your payment.`, category: 'mess', audience: { type: 'mess', mess: kMess._id }, publishedBy: manager._id },
    { title: 'Final-year students: hostel exit formalities', description: 'Final-year students must submit their no-dues form to the warden office before vacating.', category: 'general', audience: { type: 'year', year: 4 }, publishedBy: admin._id },
    { title: 'Old notice (expired)', description: 'This notice has expired and should not be visible to students.', category: 'general', audience: { type: 'all' }, publishedBy: admin._id, expiryDate: addDays(today, -2), publishDate: addDays(today, -20) },
  ];
  await M.Notice.insertMany(notices.map((n) => ({ ...n, createdBy: n.publishedBy, publishDate: n.publishDate || addDays(new Date(), -1) })));

  console.log('\nSeed complete.\n');
  console.log('Demo accounts (development only):');
  console.log(`  Admin         admin@hostel.edu    / ${DEMO.admin}`);
  console.log(`  Warden        warden@hostel.edu   / ${DEMO.warden}   (Kaveri Boys Hostel)`);
  console.log(`  Warden        warden2@hostel.edu  / ${DEMO.warden}   (Vaigai Girls Hostel)`);
  console.log(`  Mess manager  mess@hostel.edu     / ${DEMO.mess}`);
  console.log(`  Student       ${students[0].email} / ${DEMO.student}`);
  console.log(`  Student       ${students[14].email} / ${DEMO.student}`);
  await mongoose.disconnect();
}

run().catch(async (err) => { console.error('Seed failed:', err); await mongoose.disconnect(); process.exit(1); });
