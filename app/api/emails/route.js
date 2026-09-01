import { NextResponse } from 'next/server';

export async function GET() {
  const mockEmails = [
    { id: 1, account: 'tacongnam.nam@gmail.com', sender: 'Google Security', subject: 'New sign-in on Brave', type: 'gmail', time: '2 mins ago' },
    { id: 2, account: 'nam.tc252640m@sis.hust.edu.vn', sender: 'HUST Portal', subject: 'Lịch thi giữa kỳ kỳ 2023.2', type: 'outlook', time: '1 hour ago' },
    { id: 3, account: 'tacongnam.nam@gmail.com', sender: 'Vercel', subject: 'Deployment successful', type: 'gmail', time: '3 hours ago' },
  ];
  return NextResponse.json(mockEmails);
}