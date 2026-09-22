import mongoose from 'mongoose';

mongoose.connect('mongodb://admin:secret@127.0.0.1:27018/codearena?authSource=admin').then(async () => {
  const db = mongoose.connection.db;
  
  await db.collection('problems').updateOne(
    { title: /Second Largest Element/i }, 
    { 
      $set: { 
        functionSignature: { 
          functionName: 'secondLargest', 
          returnType: 'int', 
          parameters: [{name: 'nums', type: 'int[]'}] 
        } 
      } 
    }
  );

  await db.collection('problems').updateOne(
    { title: /Two Sum/i }, 
    { 
      $set: { 
        functionSignature: { 
          functionName: 'twoSum', 
          returnType: 'int[]', 
          parameters: [{name: 'nums', type: 'int[]'}, {name: 'target', type: 'int'}] 
        } 
      } 
    }
  );
  
  console.log('Updated');
  process.exit(0);
});
