-- CreateTable
CREATE TABLE "seed_works" (
    "id" TEXT NOT NULL,
    "work_key" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "work_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "cover_url" TEXT,
    "synopsis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_puzzles" (
    "id" TEXT NOT NULL,
    "puzzle_date" DATE NOT NULL,
    "book_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seed_works_work_key_key" ON "seed_works"("work_key");

-- CreateIndex
CREATE UNIQUE INDEX "books_work_key_key" ON "books"("work_key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_puzzles_puzzle_date_key" ON "daily_puzzles"("puzzle_date");

-- AddForeignKey
ALTER TABLE "daily_puzzles" ADD CONSTRAINT "daily_puzzles_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

