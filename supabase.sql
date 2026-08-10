create extension if not exists pgcrypto;

do $$ begin
  create type academic_year_status as enum ('Active', 'Inactive', 'Closed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('Administrator', 'Staff', 'Teacher');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type active_status as enum ('Active', 'Inactive');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type class_name as enum ('ទាប', 'មធ្យម', 'ខ្ពស់');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type gender_type as enum ('Female', 'Male');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type class_level_type as enum ('ទាប', 'មធ្យម', 'ខ្ពស់');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type student_status as enum ('Active', 'Inactive', 'Graduated');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type promotion_action as enum ('Promoted', 'Graduated');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type school_event_type as enum ('Event', 'Holiday', 'Announcement');
exception
  when duplicate_object then null;
end $$;

create table if not exists academic_years (
  id bigserial primary key,
  name varchar(20) not null unique,
  starts_at date not null,
  ends_at date not null,
  status academic_year_status not null default 'Inactive',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists users (
  id bigserial primary key,
  name varchar(120) not null,
  username varchar(80) not null unique,
  email varchar(160) unique,
  password varchar(255) not null,
  role user_role not null default 'Staff',
  status active_status not null default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists teachers (
  id bigserial primary key,
  teacher_code varchar(30) not null unique,
  user_id bigint references users(id) on delete set null,
  name varchar(160) not null,
  email varchar(160) unique,
  phone varchar(40) not null,
  qualification varchar(180),
  status active_status not null default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists classes (
  id bigserial primary key,
  class_code varchar(30) not null unique,
  name varchar(80) not null,
  level smallint not null,
  teacher_id bigint references teachers(id) on delete set null,
  room varchar(60),
  capacity smallint not null default 24,
  academic_year_id bigint not null references academic_years(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists students (
  id bigserial primary key,
  student_code varchar(30) not null unique,
  registration_number varchar(40) unique,
  khmer_name varchar(160) not null,
  english_name varchar(160) not null,
  gender gender_type not null,
  date_of_birth date not null,
  birth_certificate_number varchar(80),
  birth_village varchar(120),
  birth_commune varchar(120),
  birth_district varchar(120),
  birth_province varchar(120),
  birth_place varchar(255),
  parent_name varchar(160) not null,
  guardian_relation varchar(60) not null,
  father_name varchar(160),
  father_occupation varchar(160),
  mother_name varchar(160),
  mother_occupation varchar(160),
  phone varchar(40) not null,
  current_village varchar(120),
  current_commune varchar(120),
  current_district varchar(120),
  current_province varchar(120),
  address text,
  enrollment_date date not null,
  class_id bigint references classes(id) on delete set null,
  class_level class_level_type default 'ទាប',
  teacher_id bigint references teachers(id) on delete set null,
  academic_year_id bigint not null references academic_years(id) on delete cascade,
  photo_path varchar(255),
  qr_code varchar(80) unique,
  received_by_name varchar(160),
  note text,
  status student_status not null default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists certificates (
  id bigserial primary key,
  certificate_number varchar(40) not null unique,
  student_id bigint not null references students(id) on delete cascade,
  academic_year_id bigint not null references academic_years(id) on delete cascade,
  issue_date date not null,
  verification_code varchar(80) not null unique,
  pdf_path varchar(255),
  created_by bigint references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists promotions (
  id bigserial primary key,
  student_id bigint not null references students(id) on delete cascade,
  from_class_id bigint references classes(id) on delete set null,
  to_class_id bigint references classes(id) on delete set null,
  academic_year_id bigint not null references academic_years(id) on delete cascade,
  action promotion_action not null,
  promoted_at date not null,
  promoted_by bigint references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists school_settings (
  id bigserial primary key,
  school_name varchar(180) not null,
  logo_path varchar(255),
  address text,
  contact varchar(80),
  email varchar(160),
  principal_name varchar(160),
  signature_path varchar(255),
  seal_path varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists school_events (
  id bigserial primary key,
  title varchar(180) not null,
  event_date date not null,
  type school_event_type not null default 'Event',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  action varchar(255) not null,
  ip_address varchar(45),
  user_agent varchar(255),
  created_at timestamptz default now()
);

create table if not exists database_backups (
  id bigserial primary key,
  file_path varchar(255) not null,
  size_bytes bigint,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_academic_years_updated_at on academic_years;
create trigger set_academic_years_updated_at
before update on academic_years
for each row execute function set_updated_at();

drop trigger if exists set_users_updated_at on users;
create trigger set_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists set_teachers_updated_at on teachers;
create trigger set_teachers_updated_at
before update on teachers
for each row execute function set_updated_at();

drop trigger if exists set_classes_updated_at on classes;
create trigger set_classes_updated_at
before update on classes
for each row execute function set_updated_at();

drop trigger if exists set_students_updated_at on students;
create trigger set_students_updated_at
before update on students
for each row execute function set_updated_at();

drop trigger if exists set_certificates_updated_at on certificates;
create trigger set_certificates_updated_at
before update on certificates
for each row execute function set_updated_at();

drop trigger if exists set_promotions_updated_at on promotions;
create trigger set_promotions_updated_at
before update on promotions
for each row execute function set_updated_at();

drop trigger if exists set_school_settings_updated_at on school_settings;
create trigger set_school_settings_updated_at
before update on school_settings
for each row execute function set_updated_at();

drop trigger if exists set_school_events_updated_at on school_events;
create trigger set_school_events_updated_at
before update on school_events
for each row execute function set_updated_at();

alter table classes
  alter column name type varchar(80)
  using case name::text
    when 'Nursery' then 'ទាប'
    when 'Kindergarten 1' then 'មធ្យម'
    when 'Kindergarten 2' then 'ខ្ពស់'
    when 'Kindergarten 3' then 'ខ្ពស់'
    when 'មត្តេយ្យតូច' then 'ទាប'
    when 'មត្តេយ្យ ១' then 'មធ្យម'
    when 'មត្តេយ្យ ២' then 'ខ្ពស់'
    when 'មត្តេយ្យ ៣' then 'ខ្ពស់'
    else name::text
  end;

update classes
set
  name = case name
    when 'Nursery' then 'ទាប'
    when 'Kindergarten 1' then 'មធ្យម'
    when 'Kindergarten 2' then 'ខ្ពស់'
    when 'Kindergarten 3' then 'ខ្ពស់'
    when 'មត្តេយ្យតូច' then 'ទាប'
    when 'មត្តេយ្យ ១' then 'មធ្យម'
    when 'មត្តេយ្យ ២' then 'ខ្ពស់'
    when 'មត្តេយ្យ ៣' then 'ខ្ពស់'
    else name
  end,
  level = case name
    when 'Nursery' then 0
    when 'Kindergarten 1' then 1
    when 'Kindergarten 2' then 2
    when 'Kindergarten 3' then 2
    when 'មត្តេយ្យតូច' then 0
    when 'មត្តេយ្យ ១' then 1
    when 'មត្តេយ្យ ២' then 2
    when 'មត្តេយ្យ ៣' then 2
    when 'ទាប' then 0
    when 'មធ្យម' then 1
    when 'ខ្ពស់' then 2
    else level
  end;
