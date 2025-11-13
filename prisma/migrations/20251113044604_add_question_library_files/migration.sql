-- CreateTable
CREATE TABLE "question_library_files" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "filepath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT DEFAULT 'application/json',
    "checksum" TEXT,
    "uploadedBy" TEXT,
    "uploadedByEmail" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_library_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_library_files_libraryId_uploadedAt_idx" ON "question_library_files"("libraryId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "question_library_files" ADD CONSTRAINT "question_library_files_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
