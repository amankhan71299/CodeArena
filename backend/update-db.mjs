import mongoose from 'mongoose';
mongoose.connect('mongodb://admin:secret@localhost:27017/codearena?authSource=admin').then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('problems');
  await col.updateMany({}, { $addToSet: { supportedLanguages: { $each: ['java', 'cpp'] } } });
  console.log('Updated problems');
  process.exit(0);
});
