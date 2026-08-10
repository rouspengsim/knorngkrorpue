CREATE DATABASE IF NOT EXISTS kindergarten_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kindergarten_management;

CREATE TABLE academic_years (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  status ENUM('Active', 'Inactive', 'Closed') NOT NULL DEFAULT 'Inactive',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(160) NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Administrator', 'Staff', 'Teacher') NOT NULL DEFAULT 'Staff',
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE teachers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_code VARCHAR(30) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NULL UNIQUE,
  phone VARCHAR(40) NOT NULL,
  qualification VARCHAR(180) NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT teachers_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE classes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  level TINYINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NULL,
  room VARCHAR(60) NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 24,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT classes_teacher_id_foreign FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT classes_academic_year_id_foreign FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE students (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(30) NOT NULL UNIQUE,
  registration_number VARCHAR(40) NULL UNIQUE,
  khmer_name VARCHAR(160) NOT NULL,
  english_name VARCHAR(160) NOT NULL,
  gender ENUM('Female', 'Male') NOT NULL,
  date_of_birth DATE NOT NULL,
  birth_certificate_number VARCHAR(80) NULL,
  birth_village VARCHAR(120) NULL,
  birth_commune VARCHAR(120) NULL,
  birth_district VARCHAR(120) NULL,
  birth_province VARCHAR(120) NULL,
  birth_place VARCHAR(255) NULL,
  parent_name VARCHAR(160) NOT NULL,
  guardian_relation VARCHAR(60) NOT NULL,
  father_name VARCHAR(160) NULL,
  father_occupation VARCHAR(160) NULL,
  mother_name VARCHAR(160) NULL,
  mother_occupation VARCHAR(160) NULL,
  phone VARCHAR(40) NOT NULL,
  current_village VARCHAR(120) NULL,
  current_commune VARCHAR(120) NULL,
  current_district VARCHAR(120) NULL,
  current_province VARCHAR(120) NULL,
  address TEXT NULL,
  enrollment_date DATE NOT NULL,
  class_id BIGINT UNSIGNED NULL,
  class_level ENUM('ទាប', 'មធ្យម', 'ខ្ពស់') NULL DEFAULT 'ទាប',
  teacher_id BIGINT UNSIGNED NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  photo_path VARCHAR(255) NULL,
  qr_code VARCHAR(80) NULL UNIQUE,
  received_by_name VARCHAR(160) NULL,
  note TEXT NULL,
  status ENUM('Active', 'Inactive', 'Graduated') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT students_class_id_foreign FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  CONSTRAINT students_teacher_id_foreign FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT students_academic_year_id_foreign FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE certificates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  certificate_number VARCHAR(40) NOT NULL UNIQUE,
  student_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  issue_date DATE NOT NULL,
  verification_code VARCHAR(80) NOT NULL UNIQUE,
  pdf_path VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT certificates_student_id_foreign FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT certificates_academic_year_id_foreign FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  CONSTRAINT certificates_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  from_class_id BIGINT UNSIGNED NULL,
  to_class_id BIGINT UNSIGNED NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  action ENUM('Promoted', 'Graduated') NOT NULL,
  promoted_at DATE NOT NULL,
  promoted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT promotions_student_id_foreign FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT promotions_from_class_id_foreign FOREIGN KEY (from_class_id) REFERENCES classes(id) ON DELETE SET NULL,
  CONSTRAINT promotions_to_class_id_foreign FOREIGN KEY (to_class_id) REFERENCES classes(id) ON DELETE SET NULL,
  CONSTRAINT promotions_academic_year_id_foreign FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  CONSTRAINT promotions_promoted_by_foreign FOREIGN KEY (promoted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE school_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(180) NOT NULL,
  logo_path VARCHAR(255) NULL,
  address TEXT NULL,
  contact VARCHAR(80) NULL,
  email VARCHAR(160) NULL,
  principal_name VARCHAR(160) NULL,
  signature_path VARCHAR(255) NULL,
  seal_path VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE school_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  event_date DATE NOT NULL,
  type ENUM('Event', 'Holiday', 'Announcement') NOT NULL DEFAULT 'Event',
  description TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  CONSTRAINT activity_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE database_backups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(255) NOT NULL,
  size_bytes BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  CONSTRAINT database_backups_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
