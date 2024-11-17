// promise syntax, modern approach
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise
    .resolve(requestHandler(req, res, next))
    .catch((err) => next(err));
  }
}

export default asyncHandler;


/* 
// break-down of try-catch approach
const asyncHandler = (func) => {}
const asyncHandler = (func) => () => {}
const asyncHandler = (func) => { return () => {} }
const asyncHandler = (func) => async () => {}

// try-catch syntax
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch(err) {
   res.status(err.code || 500).json({
   success: false,
   message: err.message
   })
  }  
}
*/