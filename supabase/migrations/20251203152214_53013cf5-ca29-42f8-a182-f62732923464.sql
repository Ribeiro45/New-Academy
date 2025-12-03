-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Admins can manage groups" ON public.groups
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Leaders can view their own groups" ON public.groups
  FOR SELECT USING (auth.uid() = leader_id OR has_role(auth.uid(), 'lider'::app_role));

-- RLS Policies for group_members
CREATE POLICY "Admins can manage group members" ON public.group_members
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Leaders can view members of their groups" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can manage members of their groups" ON public.group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.leader_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();