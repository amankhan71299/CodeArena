import mongoose from 'mongoose';

const ExampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: '' }
}, { _id: false });

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  hidden: { type: Boolean, default: true }
}, { _id: false });

const EditorialSchema = new mongoose.Schema({
  explanation: { type: String, default: '' },
  approach: { type: String, default: '' },
  algorithm: { type: String, default: '' },
  complexity: { type: String, default: '' },
  codeExplanation: { type: String, default: '' }
}, { _id: false });

const ParameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }
}, { _id: false });

const FunctionSignatureSchema = new mongoose.Schema({
  functionName: { type: String, required: true },
  returnType: { type: String, required: true },
  parameters: [ParameterSchema]
}, { _id: false });

const ProblemSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Title is required'], 
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long']
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      index: true
    },
    description: { 
      type: String, 
      required: [true, 'Description is required']
    },
    difficulty: { 
      type: String, 
      required: true,
      enum: ['Easy', 'Medium', 'Hard']
    },
    topics: { 
      type: [String], 
      default: [] 
    },
    constraints: { 
      type: [String], 
      default: [] 
    },
    examples: {
      type: [ExampleSchema],
      default: []
    },
    testCases: {
      type: [TestCaseSchema],
      required: true,
      validate: [v => v.length > 0, 'At least one test case is required']
    },
    timeLimit: { 
      type: Number, 
      required: [true, 'Time limit (ms) is required'],
      min: [100, 'Time limit must be at least 100ms'],
      max: [10000, 'Time limit cannot exceed 10000ms']
    },
    memoryLimit: { 
      type: Number, 
      required: [true, 'Memory limit (MB) is required'],
      min: [16, 'Memory limit must be at least 16MB'],
      max: [1024, 'Memory limit cannot exceed 1024MB']
    },
    supportedLanguages: {
      type: [String],
      required: true,
      validate: [v => v.length > 0, 'At least one supported language is required']
    },
    editorial: {
      type: EditorialSchema,
      default: null
    },
    functionSignature: {
      type: FunctionSignatureSchema,
      default: null
    },
    archived: { 
      type: Boolean, 
      default: false 
    }
  },
  { timestamps: true }
);

export default mongoose.model('Problem', ProblemSchema);
