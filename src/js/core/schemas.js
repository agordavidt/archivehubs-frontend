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


/**
 * @typedef {Object} ProfileHeader
 * @property {string} fullName
 * @property {string} headline
 * @property {string} [tagline]
 * @property {string} [location]
 * @property {number} connectionCount
 * @property {string} profilePic
 * @property {string} banner
 * @property {'none'|'connections'|'public'} connectionStatus
 * @property {boolean} isOwner
 */

/**
 * @typedef {Object} ExperienceEntry
 * @property {string} id
 * @property {string} title
 * @property {string} company
 * @property {string} [companyLogo]
 * @property {string} [location]
 * @property {string} [startDate]      YYYY-MM
 * @property {string} [endDate]
 * @property {boolean} current
 * @property {string} [description]
 * @property {string[]} [tools]
 */

/**
 * @typedef {Object} EducationEntry
 * @property {string} id
 * @property {string} institution
 * @property {string} [degree]
 * @property {string} [field]
 * @property {string} [startYear]
 * @property {string} [endYear]
 * @property {string} [description]
 */

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {'individual'|'corporate'} account_type
 * @property {ProfileHeader} header
 * @property {{ bio?: string, expertise?: string }} about
 * @property {{ email?: string, phone?: string, website?: string, address?: string }} contact
 * @property {ExperienceEntry[]} experience
 * @property {EducationEntry[]} education
 * @property {Array} licenses
 * @property {Array} affiliations
 * @property {Array} volunteer
 * @property {Array<{language: string, proficiency: string}>} languages
 * @property {Array<{name: string, level?: string}>} skills
 * @property {string[]} personalInterests
 * @property {Array} references
 */

export {};