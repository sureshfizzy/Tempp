import React, { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import UserRolesList from "@/components/user-roles";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function RolesPage() {
  const [, navigate] = useLocation();
  
  // Check if user is admin
  const { data: connectionStatus, isLoading } = useQuery<{
    connected: boolean;
    isAdmin: boolean;
    configured: boolean;
  }>({
    queryKey: ["/api/connection-status"],
    refetchOnWindowFocus: false,
  });

  // Redirect non-admin users using useEffect
  useEffect(() => {
    if (!isLoading && connectionStatus && !connectionStatus.isAdmin) {
      navigate("/");
    }
  }, [connectionStatus, isLoading, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="User Roles"
        description="Create and manage user roles with different permission levels"
        actions={
          <Button onClick={() => navigate("/settings")} variant="outline">
            Back to Settings
          </Button>
        }
      />
      
      <div className="mt-6">
        <UserRolesList />
      </div>
    </div>
  );
}