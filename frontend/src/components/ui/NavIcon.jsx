const icons = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5h7.5V3H3v7.5zm0 10.5h7.5V13.5H3v7.5zm10.5-10.5H21V3h-7.5v7.5zm0 10.5H21V13.5h-7.5v7.5z"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19a4 4 0 0 0-8 0m11-4a3 3 0 1 0-5.5-1.7M7 11a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
    />
  ),
  plans: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
    />
  ),
  schedule: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
    />
  ),
  classes: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 10h16M4 14h10M4 18h6"
    />
  ),
  swap: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h11l-2-2m2 12H7l2 2"
    />
  ),
  bell: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
    />
  ),
  chart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-5"
    />
  ),
  wallet: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9ZM16 12h3"
    />
  ),
  settings: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.3 4.3 9.6 2h4.8l-.7 2.3a7 7 0 0 1 1.8 1l2.3-.7 2.4 2.4-.7 2.3a7 7 0 0 1 0 2l.7 2.3-2.4 2.4-2.3-.7a7 7 0 0 1-1.8 1l.7 2.3h-4.8l.7-2.3a7 7 0 0 1-1.8-1l-2.3.7L2.7 14l.7-2.3a7 7 0 0 1 0-2L2.7 7.4l2.4-2.4 2.3.7a7 7 0 0 1 1.8-1Z"
    />
  ),
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
    />
  ),
  calendar: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
    />
  ),
  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 19a4 4 0 0 0-8 0m4-12a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
    />
  ),
  lock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
    />
  ),
  list: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  ),
  menu: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
  ),
  chevronLeft: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18 9 12l6-6" />
  ),
  chevronRight: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
  ),
  chevronDown: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  ),
  filter: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M7 12h10M10 18h4"
    />
  ),
  plus: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  ),
  refresh: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 6v5h-5M4 18v-5h5m9.2-4A7 7 0 0 0 6.8 7.6L4 11m16 2-2.8 3.4A7 7 0 0 1 5.8 15"
    />
  ),
  edit: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m16 4 2 2-9 9H7v-3l9-9Z M5 20h14"
    />
  ),
  trash: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 7h14M10 11v6m4-6v6M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"
    />
  ),
  close: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  ),
  eye: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
    />
  ),
  eyeOff: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-7 9.5-7c1.8 0 3.4.5 4.8 1.2M21.5 12s-3.5 7-9.5 7c-1.8 0-3.4-.5-4.8-1.2"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18" />
    </>
  ),
};

export default function NavIcon({ name, className = 'h-5 w-5' }) {
  const path = icons[name];

  if (!path) {
    return null;
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
