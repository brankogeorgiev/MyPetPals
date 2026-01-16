import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Family = Database['public']['Tables']['families']['Row'];
type FamilyMember = Database['public']['Tables']['family_members']['Row'];
type FamilyInvitation = Database['public']['Tables']['family_invitations']['Row'];

export interface FamilyWithMembers extends Family {
  members: (FamilyMember & { profile?: { full_name: string | null; avatar_url: string | null } })[];
  member_count: number;
}

export function useFamilies() {
  const { user } = useAuth();
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFamilies = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Get families the user belongs to
    const { data: familiesData, error } = await supabase
      .from('families')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !familiesData) {
      setLoading(false);
      return;
    }

    // For each family, get members with their profiles
    const familiesWithMembers: FamilyWithMembers[] = await Promise.all(
      familiesData.map(async (family) => {
        const { data: members } = await supabase
          .from('family_members')
          .select('*, profiles(full_name, avatar_url)')
          .eq('family_id', family.id);
        
        return {
          ...family,
          members: (members || []).map(m => ({
            ...m,
            profile: m.profiles as any,
          })),
          member_count: members?.length || 0,
        };
      })
    );

    setFamilies(familiesWithMembers);
    setLoading(false);
  };

  const createFamily = async (name: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Create the family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (familyError || !family) {
      return { error: familyError };
    }

    // Add creator as first member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: user.id });

    if (memberError) {
      return { error: memberError };
    }

    await fetchFamilies();
    return { data: family, error: null };
  };

  const joinFamilyByCode = async (inviteCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Find family by invite code
    const { data: family, error: findError } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (findError || !family) {
      return { error: new Error('Invalid invite code') };
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', family.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return { error: new Error('You are already a member of this family') };
    }

    // Add as member
    const { error: joinError } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: user.id });

    if (joinError) {
      return { error: joinError };
    }

    await fetchFamilies();
    return { data: family, error: null };
  };

  const leaveFamily = async (familyId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', user.id);

    if (!error) {
      await fetchFamilies();
    }

    return { error };
  };

  const deleteFamily = async (familyId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('families')
      .delete()
      .eq('id', familyId);

    if (!error) {
      await fetchFamilies();
    }

    return { error };
  };

  const inviteByEmail = async (familyId: string, email: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('family_invitations')
      .insert({
        family_id: familyId,
        email: email.toLowerCase(),
        invited_by: user.id,
      });

    return { error };
  };

  const assignPetToFamily = async (petId: string, familyId: string | null) => {
    const { error } = await supabase
      .from('pets')
      .update({ family_id: familyId })
      .eq('id', petId);

    return { error };
  };

  useEffect(() => {
    if (user) {
      fetchFamilies();
    }
  }, [user]);

  return {
    families,
    loading,
    fetchFamilies,
    createFamily,
    joinFamilyByCode,
    leaveFamily,
    deleteFamily,
    inviteByEmail,
    assignPetToFamily,
  };
}
