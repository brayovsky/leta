const { Router } = require('express');
const User = require('../db/models/User');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/users', requireAuth, async (req, res) => {
  const users = await User.aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders',
      },
    },
    {
      $project: {
        waId: 1,
        phoneNumber: 1,
        email: 1,
        createdAt: 1,
        orderCount: { $size: '$orders' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.json(users);
});

module.exports = router;
