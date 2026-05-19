const Store = require('../db/models/Store');

const RADIUS_METERS = 3000;
const MAX_SAVED_LOCATIONS = 5;

async function findStoresNear(longitude, latitude) {
  return Store.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: RADIUS_METERS,
      },
    },
  });
}

function buildLocationPrompt(user) {
  if (!user.locations?.length) {
    return 'Welcome! To get started, please share your delivery location (tap the attachment icon, then Location).';
  }
  const list = user.locations
    .map((l, i) => `${i + 1}. ${l.name}`)
    .join('\n');
  return `Welcome back! Reply with a number to reuse a saved location, or share a new one:\n${list}`;
}

function addToUserLocations(user, name, coordinates) {
  const TOL = 0.0005;
  const existing = user.locations?.find(l =>
    Math.abs((l.coordinates?.[0] ?? 0) - coordinates[0]) < TOL &&
    Math.abs((l.coordinates?.[1] ?? 0) - coordinates[1]) < TOL
  );

  if (existing) {
    existing.lastUsedAt = new Date();
    return;
  }

  user.locations = user.locations || [];
  user.locations.push({ name, coordinates, lastUsedAt: new Date() });
  user.locations.sort((a, b) => (b.lastUsedAt - a.lastUsedAt));
  if (user.locations.length > MAX_SAVED_LOCATIONS) {
    user.locations = user.locations.slice(0, MAX_SAVED_LOCATIONS);
  }
}

module.exports = { findStoresNear, buildLocationPrompt, addToUserLocations, RADIUS_METERS };
