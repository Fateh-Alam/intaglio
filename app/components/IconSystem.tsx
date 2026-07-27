import React from 'react';

// Simple class merger
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

type IconState = 'default' | 'active' | 'selected' | 'disabled';

interface CameraBadgeProps {
  text: string;
  state?: IconState;
  className?: string;
}

// Typographic Badge for settings (ISO, WB, RAW, etc.)
export function CameraBadge({ 
  text, 
  state = 'default',
  className
}: CameraBadgeProps) {
  return (
    <div className={cn(
      "intaglio-icon font-intaglio-sans text-[10px] tracking-wider font-semibold uppercase",
      state === 'active' && "intaglio-icon-active",
      state === 'selected' && "intaglio-icon-selected",
      state === 'disabled' && "intaglio-icon-disabled",
      className
    )}>
      {text}
    </div>
  );
}

interface IconWrapperProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  state?: IconState;
}

// Wrapper for Tabler or Material icons to ensure consistency
export function IconWrapper({
  children,
  state = 'default',
  className,
  ...props
}: IconWrapperProps) {
  return (
    <span 
      className={cn(
        "intaglio-icon",
        state === 'active' && "intaglio-icon-active",
        state === 'selected' && "intaglio-icon-selected",
        state === 'disabled' && "intaglio-icon-disabled",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Force standard Tabler Icon props if possible to ensure 1.5 stroke and size
          // We apply the CSS to handle the rest.
          // We apply the CSS to handle the rest.
          const childProps = child.props as any;
          return React.cloneElement(child as React.ReactElement<any>, {
            size: childProps.size || 24,
            stroke: childProps.stroke || 1.5,
          });
        }
        return child;
      })}
    </span>
  );
}

// ============================================================================
// MATERIAL SYMBOLS SHARP (Custom Extracted)
// ============================================================================
// When Tabler is missing a specialist camera function, extract the raw path 
// from Material Symbols Sharp and wrap it here. The stroke-width="1.5" and
// CSS overrides will automatically make it indistinguishable from Tabler.

export function IconCameraMacro(props: Omit<IconWrapperProps, 'children'>) {
  return (
    <IconWrapper {...props}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
      >
        {/* Extracted from Material Symbols Sharp - Macro */}
        <path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5zm-5 13.5v-1.5h10v1.5H7z" />
      </svg>
    </IconWrapper>
  );
}
