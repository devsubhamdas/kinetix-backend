import SearchTerm from "../models/searchTerm.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { t: term } = req.query;
  const RESULT_LIMIT = 5;

  if (!term) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "Suggestions fetched"));
  }

  const suggestions = await SearchTerm.aggregate([
    {
      $search: {
        index: "searchterm_search",
        compound: {
          should: [
            {
              autocomplete: {
                query: term,
                path: "term",
                fuzzy: { maxEdits: 1, prefixLength: 2 },
                score: { boost: { value: 2 } },
              },
            },
            {
              text: {
                query: term,
                path: "term",
                fuzzy: { maxEdits: 2, prefixLength: 1 },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: RESULT_LIMIT },
    { $project: { _id: 0, term: 1, score: { $meta: "searchScore" } } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, suggestions, "Suggestions fetched"));
});

export { getSearchSuggestions };
