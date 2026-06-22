CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(150) UNIQUE NOT NULL,
  password            VARCHAR(255) NOT NULL,
  bio                 VARCHAR(255),
  profile_picture_url VARCHAR(255) DEFAULT 'https://example.com/default.jpg',
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tweets (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    VARCHAR(280) NOT NULL,
  image_url  VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tweets_user_id ON tweets(user_id);

CREATE TABLE likes (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id   INT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, tweet_id)
);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_tweet_id ON likes(tweet_id);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id   INT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  content    VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_tweet_id ON comments(tweet_id);

CREATE TABLE followers (
  following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  follower_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (following_id, follower_id)
);
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);

CREATE TABLE hashtags (
  id         SERIAL PRIMARY KEY,
  tag        VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tweet_hashtags (
  tweet_id   INT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  hashtag_id INT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (tweet_id, hashtag_id)
);
CREATE INDEX idx_tweet_hashtags_tweet_id ON tweet_hashtags(tweet_id);
CREATE INDEX idx_tweet_hashtags_hashtag_id ON tweet_hashtags(hashtag_id);