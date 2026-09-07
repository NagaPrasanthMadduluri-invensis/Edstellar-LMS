"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavFooter, SidebarNavGroup } from "@/components/layout/sidebar-nav";
import Text from "@/components/ui/text";
import { learnerNav } from "@/lib/nav-config";

export function LearnerSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarNavGroup items={learnerNav.main} />
        <SidebarNavGroup label="My Learnings" items={learnerNav.myLearnings} />
        <SidebarNavGroup label="My Progress" items={learnerNav.progress} />
        <SidebarNavGroup label="My Achievements" items={learnerNav.achievements} />
        <SidebarNavGroup label="My Team" items={learnerNav.team} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <Text
          as="span"
          className="px-2 pb-1 text-[10px] font-medium text-sidebar-foreground/40 tracking-wide"
        >
          Powered by Edstellar
        </Text>
        <SidebarNavFooter items={learnerNav.footer} />
      </SidebarFooter>
    </Sidebar>
  );
}
