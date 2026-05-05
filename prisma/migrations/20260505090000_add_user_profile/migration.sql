CREATE TABLE "UserProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

ALTER TABLE "UserProfile"
ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
