/** טקסט שמאל-לימין בתוך ממשק RTL: מזהים, מספרים, שמות באנגלית. הרכיב היחיד שמגדיר dir="ltr". */
export function Ltr({ className = '', children, ...rest }) {
  return <bdi {...rest} dir="ltr" className={className || undefined}>{children}</bdi>;
}

/** מספרים, תאריכים וקואורדינטות: פונט רגיל, tabular-nums, 13px */
export function Num({ className = '', children, ...rest }) {
  return <Ltr {...rest} className={`num ${className}`.trim()}>{children}</Ltr>;
}

/** מזהים בלבד (IMO, MMSI, D&B, סימן קריאה): פונט מונו-ספייס */
export function Mono({ className = '', children, ...rest }) {
  return <Ltr {...rest} className={`mono ${className}`.trim()}>{children}</Ltr>;
}
