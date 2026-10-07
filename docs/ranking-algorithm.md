# Ranking Algorithm

## Overview

Given a group of members (each with their own preferences) and a pool of candidate movies, the engine returns the top 10 movies that best satisfy the whole group.

---

## Steps

### 1. Candidate Pre-filter (DB layer — O(log N))
Before the engine runs, the controller issues a MongoDB query using indexed fields (`genres`, `language`, `runtime`, `rating`) with **loose bounds** (±20–50%) to fetch at most 1,000 candidates (most popular first). This avoids loading the entire collection into memory.

### 2. Hard Constraints (O(C × M))
Each candidate is tested against four hard constraints derived from the group's preferences:

| Constraint | Rule |
|---|---|
| **Platform** | At least one streaming platform must be available to all members (configurable majority via `PLATFORM_MAJORITY`). |
| **maxRuntime** | Movie runtime ≤ the *lowest* `maxRuntime` across all members. |
| **minRating** | Movie rating ≥ the *highest* `minRating` across all members. |
| **Language** | Movie language must appear in the union of all members' language lists. |

Movies failing any constraint are discarded.

### 3. Fallback Relaxation (O(R × C × M), R = relaxation steps ≤ 4)
If fewer than 10 movies survive hard constraints, constraints are relaxed **one at a time** in this order until ≥ 10 results are found:

1. `maxRuntime`
2. `minRating`
3. `language`
4. `platform`

Each relaxed constraint is recorded and surfaced in the API response and movie explanations.

### 4. Mood Expansion (O(M))
Before scoring, each member's `mood` field is mapped to additional genres:

| Mood | Genres Added |
|---|---|
| `light` | Comedy, Family, Animation |
| `dark` | Thriller, Crime, Horror |
| `romantic` | Romance, Drama |
| `adventurous` | Adventure, Action, Science Fiction |
| `thoughtful` | Drama, Documentary, History |
| `scary` | Horror, Mystery, Thriller |

These are merged with the member's explicit genre list before scoring.

### 5. Soft Scoring (O(C × M))
Each surviving movie receives a composite score in **[0, 1]**:

```
score = 0.40 × genreOverlap
      + 0.25 × rating        (normalised over filtered set)
      + 0.20 × popularity    (normalised over filtered set)
      + 0.15 × fairness
```

| Term | Meaning |
|---|---|
| **genreOverlap** | Fraction of members who have ≥1 matching genre with the movie (after mood expansion). |
| **rating** | Min-max normalised rating within the filtered candidate set. |
| **popularity** | Min-max normalised popularity within the filtered candidate set. |
| **fairness** | Same as genreOverlap — penalises movies that only satisfy a minority of the group. |

The fairness term ensures a movie loved by one member but irrelevant to everyone else cannot dominate the shortlist.

### 6. Sort & Slice (O(C log C))
Movies are sorted descending by score. Ties are broken by `tmdbId` (ascending) for determinism. The top 10 are returned.

### 7. Explanation Generation (O(10))
Each result gets a human-readable explanation string, e.g.:

> "Matches 4/5 members' genres, on Netflix, 112 min, ⭐ 8.1"

If constraints were relaxed, they are appended: `[relaxed: maxRuntime, platform]`.

---

## Weights Config

Weights live in a single `WEIGHTS` object in `rankingEngine.js` and can be tuned without touching logic:

```js
const WEIGHTS = {
  genreOverlap: 0.40,
  rating:       0.25,
  popularity:   0.20,
  fairness:     0.15,
};
```

---

## Time Complexity

| Step | Complexity |
|---|---|
| DB pre-filter | O(log N) — index scan |
| Hard constraints | O(C × M) |
| Fallback (worst case) | O(4 × C × M) |
| Soft scoring | O(C × M) |
| Sort | O(C log C) |
| **Total** | **O(C × M + C log C)** |

Where C = candidates (≤ 300), M = members (typically ≤ 20). In practice this is fast enough to run synchronously on the server.

---

## Plain-English Interview Walkthrough

> "We collect each member's preferences — genres, platforms, runtime limit, minimum rating, and mood. Before scoring anything, we hit the database with a loose query on indexed fields to pull at most 300 candidate movies, so we never load the whole collection.
>
> Then we apply hard constraints: a movie must be on a platform everyone has, fit within the tightest runtime limit, meet the strictest minimum rating, and be in a language someone in the group wants. If that leaves fewer than 10 movies, we relax constraints one at a time — runtime first, then rating, then language, then platform — and we tell the user which constraints we had to drop.
>
> For the movies that survive, we score each one on four dimensions: how many members' genres it matches, its normalised rating, its normalised popularity, and a fairness term that's the same as genre overlap — this stops a movie that only one person loves from gaming the score. We weight genre overlap and fairness highest because group satisfaction is the whole point.
>
> Finally we sort descending, break ties by TMDB ID for determinism, and return the top 10 with a plain-English explanation for each — something like 'Matches 4/5 members' genres, on Netflix, 112 min, ⭐ 8.1'. The whole thing is a pure function with no database calls, so it's trivial to unit-test and easy to swap out the weights."
