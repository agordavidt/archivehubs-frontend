/**
 * The single place we define every shape.
 * Every mock, every renderer, every store event uses these.
 */

/**
 * @typedef {Object} CurrentUser
 * @property {string} id
 * @property {string} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} [otherName]
 * @property {'individual'|'corporate'} account_type
 * @property {string} [profilePic]
 */

/**
 * @typedef {Object} FeedPost
 * @property {string}   id
 * @property {string}   textContent
 * @property {number}   createdAt         ms epoch
 * @property {string[]} mediaUrls
 * @property {string}   authorName
 * @property {string}   userProfilePic
 * @property {number}   likeCount
 * @property {number}   commentCount
 * @property {boolean}  isLiked
 */

/**
 * @typedef {Object} CommentAuthor
 * @property {string} id
 * @property {string} name
 * @property {string} profilePic
 */

/**
 * @typedef {Object} Comment
 * @property {string}        id
 * @property {string}        text
 * @property {number}        createdAt
 * @property {CommentAuthor} author
 * @property {string|null}   parentId
 */
export {};