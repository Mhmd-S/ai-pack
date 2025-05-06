'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createProject } from '@/actions/project';
import { useState } from 'react';
import { ProjectFormState } from '@/lib/definitions'; // Import the state type

const FOOD_TYPES = [
  { value: 'burger', label: 'Burger' },
  { value: 'fries', label: 'Fries' },
  { value: 'pizza', label: 'Pizza Slice' },
];

const PACKAGING_TYPES = [
  { value: 'clamshell', label: 'Clamshell Box' },
  { value: 'pizza_box', label: 'Pizza Box' },
  { value: 'fry_carton', label: 'Fry Carton' },
];

export default function Page() {
  // Provide explicit types for useActionState
  const [state, action, pending] = useActionState<ProjectFormState | undefined, FormData>(
    createProject,
    undefined // Initial state
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Handle logo preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create New Packaging Project</CardTitle>
        <CardDescription>
          Create a custom branded packaging for your food products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" action={action}>
          {/* Display general message (which could be an error) */}
          {state?.message && (
            <Alert variant={state.errors ? "destructive" : "default"}> {/* Or always destructive if message is always error */}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Burger Package"
              disabled={pending}
            />
            {state?.errors?.name && (
              <p className="text-red-500 text-sm">{state.errors.name[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="logo">Brand Logo</Label>
            <div className="flex space-x-4 items-center">
              <Input
                id="logo" // HTML id
                name="logo" // formData key, ensure ProjectFormSchema uses 'logoFile' for the data from formData.get('logo')
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={pending}
                className="flex-1"
              />
              {logoPreview && (
                <div className="h-12 w-12 rounded-md overflow-hidden border border-gray-200">
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
            {/* Corrected error key to match ProjectFormState and Zod schema */}
            {state?.errors?.logoFile && (
              <p className="text-red-500 text-sm">{state.errors.logoFile[0]}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue="#ff0000"
                  className="w-12 h-10 p-1 border rounded-md"
                  disabled={pending}
                />
                <span className="text-sm text-gray-500">Brand primary color</span>
              </div>
              {state?.errors?.primaryColor && (
                <p className="text-red-500 text-sm">{state.errors.primaryColor[0]}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  defaultValue="#ffffff"
                  className="w-12 h-10 p-1 border rounded-md"
                  disabled={pending}
                />
                <span className="text-sm text-gray-500">Optional</span>
              </div>
              {state?.errors?.secondaryColor && (
                <p className="text-red-500 text-sm">{state.errors.secondaryColor[0]}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Food Type</Label>
            <Select
              name="foodType"
              defaultValue=""
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select food type" />
              </SelectTrigger>
              <SelectContent>
                {FOOD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.foodType && (
              <p className="text-red-500 text-sm">{state.errors.foodType[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Packaging Template</Label>
            <Select
              name="packagingType"
              defaultValue=""
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select packaging template" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGING_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.packagingType && (
              <p className="text-red-500 text-sm">{state.errors.packagingType[0]}</p>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating Project...' : 'Create Project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}