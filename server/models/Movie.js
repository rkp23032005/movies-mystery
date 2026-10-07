const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  { name: String, type: { type: String, enum: ['flatrate', 'rent', 'buy'] } },
  { _id: false }
);

const movieSchema = new mongoose.Schema(
  {
    tmdbId:       { type: Number, required: true, unique: true },
    title:        { type: String, required: true },
    overview:     { type: String, default: '' },
    genres:       { type: [String], default: [] },
    language:     { type: String, default: 'en' },
    runtime:      { type: Number, default: 0 },
    releaseYear:  { type: Number },
    rating:       { type: Number, default: 0 },
    popularity:   { type: Number, default: 0 },
    posterPath:   { type: String, default: '' },
    backdropPath: { type: String, default: '' },
    cast:         { type: [String], default: [] },
    trailerKey:   { type: String, default: '' },
    // Map<region, provider[]>  e.g. { IN: [{name:'Netflix',type:'flatrate'}] }
    providers:    { type: Map, of: [providerSchema], default: {} },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

// Full-text search on title (weight 10) and overview (weight 3).
// language_override:'none' prevents MongoDB from treating the `language` field
// as a per-document language selector (which would reject values like 'hi').
movieSchema.index(
  { title: 'text', overview: 'text' },
  { weights: { title: 10, overview: 3 }, name: 'text_search', language_override: 'none' }
);

// Primary sort/filter index: genre list + language + rating — covers the most common
// filter combination and supports range queries on rating after equality on genres/language
movieSchema.index({ genres: 1, language: 1, rating: -1 }, { name: 'genre_lang_rating' });

// Popularity-first browsing (default sort when no query)
movieSchema.index({ popularity: -1 }, { name: 'popularity_desc' });

// Year-range filter used in yearFrom/yearTo queries
movieSchema.index({ releaseYear: -1 }, { name: 'release_year_desc' });

// Provider lookup: to answer "which movies are on Netflix in IN?" we need to
// reach inside the Map. We index the flattened provider names via a wildcard
// on the providers map values so MongoDB can filter on provider name efficiently.
movieSchema.index({ 'providers.$**': 1 }, { name: 'providers_wildcard' });

module.exports = mongoose.model('Movie', movieSchema);
