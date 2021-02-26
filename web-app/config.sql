CREATE TABLE students (
  google_oauth_id VARCHAR(21) PRIMARY KEY NOT NULL,
  first_name VARCHAR(35) NOT NULL,
  last_name VARCHAR(35) NOT NULL,
  email VARCHAR(255) NOT NULL,
  google_profile_pic_url VARCHAR(550) NOT NULL,
  seminar_zoom_link VARCHAR(550) NOT NULL DEFAULT '',
  student_did_setup TINYINT(1) NOT NULL DEFAULT 0,
  graduation_year INT NOT NULL DEFAULT 0,
  did_consent_to_email TINYINT(1) NOT NULL DEFAULT 0,
  wants_daily_email TINYINT(1) NOT NULL DEFAULT 0,
  has_seen_onboarding TINYINT(1) NOT NULL DEFAULT 0,
  signed_up_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
  student_oauth_id VARCHAR(21) NOT NULL,
  class_id VARCHAR(20) PRIMARY KEY NOT NULL,
  period_number INT NOT NULL,
  class_name VARCHAR(300) NOT NULL,
  zoom_link VARCHAR(550) NOT NULL,
  is_athletics TINYINT(1) NOT NULL DEFAULT 0,
  bound_for_deletion TINYINT(1) NOT NULL DEFAULT 0
);

-- New table
CREATE TABLE cal_events (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  start TIMESTAMP NOT NULL,
  end TIMESTAMP NOT NULL,
  name VARCHAR(50) NOT NULL,
  location VARCHAR(550), -- Zoom link/location
  user_id VARCHAR(21) NOT NULL,
  color TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES students(google_oauth_id) ON DELETE CASCADE
);
