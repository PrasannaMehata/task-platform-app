const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' })
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

const createTaskSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }).trim(),
  inputText: z.string().min(1, { message: 'Input text is required' }),
  operationType: z.enum(['uppercase', 'lowercase', 'reverse_string', 'word_count'], {
    errorMap: () => ({ message: 'Invalid operation type. Must be uppercase, lowercase, reverse_string, or word_count' })
  })
});

const queryTasksSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  status: z.enum(['pending', 'running', 'success', 'failed']).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  queryTasksSchema
};
