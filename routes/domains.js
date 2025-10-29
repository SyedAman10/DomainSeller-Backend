const express = require('express');
const router = express.Router();
const { sql } = require('../config/database');

/**
 * GET /api/domains
 * Get all domains
 */
router.get('/', async (req, res) => {
  try {
    const domains = await sql`
      SELECT * FROM domains 
      ORDER BY created_at DESC
    `;
    res.json({
      success: true,
      count: domains.length,
      data: domains
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domains',
      message: error.message
    });
  }
});

/**
 * GET /api/domains/:id
 * Get a specific domain by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const domain = await sql`
      SELECT * FROM domains 
      WHERE id = ${id}
    `;
    
    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    res.json({
      success: true,
      data: domain[0]
    });
  } catch (error) {
    console.error('Error fetching domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domain',
      message: error.message
    });
  }
});

/**
 * POST /api/domains
 * Create a new domain
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }
    
    const newDomain = await sql`
      INSERT INTO domains (name, price, description, category)
      VALUES (${name}, ${price}, ${description || null}, ${category || null})
      RETURNING *
    `;
    
    res.status(201).json({
      success: true,
      data: newDomain[0]
    });
  } catch (error) {
    console.error('Error creating domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create domain',
      message: error.message
    });
  }
});

/**
 * PUT /api/domains/:id
 * Update a domain
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category } = req.body;
    
    const updatedDomain = await sql`
      UPDATE domains 
      SET 
        name = COALESCE(${name}, name),
        price = COALESCE(${price}, price),
        description = COALESCE(${description}, description),
        category = COALESCE(${category}, category),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (updatedDomain.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedDomain[0]
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update domain',
      message: error.message
    });
  }
});

/**
 * DELETE /api/domains/:id
 * Delete a domain
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDomain = await sql`
      DELETE FROM domains 
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (deletedDomain.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Domain deleted successfully',
      data: deletedDomain[0]
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete domain',
      message: error.message
    });
  }
});

module.exports = router;

