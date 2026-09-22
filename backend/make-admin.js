import mongoose from 'mongoose';

const email = process.argv[2];
if (!email) {
  console.error('Email required');
  process.exit(1);
}

mongoose.connect('mongodb://admin:secret@127.0.0.1:27018/codearena?authSource=admin').then(async () => {
  await mongoose.connection.db.collection('users').updateOne({ email }, { $set: { role: 'admin' } });
  console.log(`Elevated ${email} to admin`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
