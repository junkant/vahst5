// src/lib/types/client.ts

export interface Client {
  id: string;
  slug: string; // Add this field
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastServiceDate?: Date;
  tenantId: string;
}