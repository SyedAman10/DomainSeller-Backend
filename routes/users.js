const express = require('express');
const router = express.Router();
const { sql } = require('../config/database');

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req, res) => {
  try {
    const users = await sql`
      SELECT id, username, email, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await sql`
      SELECT id, username, email, created_at, updated_at 
      FROM users 
      WHERE id = ${id}
    `;
    
    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }
    
    // Note: In production, you should hash the password before storing
    const newUser = await sql`
      INSERT INTO users (username, email, password)
      VALUES (${username}, ${email}, ${password})
      RETURNING id, username, email, created_at
    `;
    
    res.status(201).json({
      success: true,
      data: newUser[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;
    
    const updatedUser = await sql`
      UPDATE users 
      SET 
        username = COALESCE(${username}, username),
        email = COALESCE(${email}, email),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, username, email, created_at, updated_at
    `;
    
    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedUser[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await sql`
      DELETE FROM users 
      WHERE id = ${id}
      RETURNING id, username, email
    `;
    
    if (deletedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser[0]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

module.exports = router;

