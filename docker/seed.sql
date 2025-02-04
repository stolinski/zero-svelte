CREATE DATABASE zstart;
CREATE DATABASE zstart_cvr;
CREATE DATABASE zstart_cdb;

\c zstart;

CREATE TABLE "type" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL
);

CREATE TABLE "todo" (
  "id" VARCHAR PRIMARY KEY,
  "title" VARCHAR NOT NULL,
  "completed" BOOLEAN NOT NULL,
  "type_id" VARCHAR REFERENCES "type"(id)
);

INSERT INTO "type" (id, name) VALUES ('1', 'Personal');
INSERT INTO "type" (id, name) VALUES ('2', 'Work');
INSERT INTO "type" (id, name) VALUES ('3', 'Shopping');

INSERT INTO "todo" (id, title, completed, type_id) VALUES ('1', 'Buy groceries', false, '3');
INSERT INTO "todo" (id, title, completed, type_id) VALUES ('2', 'Finish report', true, '2');
INSERT INTO "todo" (id, title, completed, type_id) VALUES ('3', 'Call mom', false, '1');