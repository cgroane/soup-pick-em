
export const increaseDays = (date: Date, amount: number) => new Date(date.setDate(date.getDate() + amount));
export const buildWeeks = (start: Date, end: Date) => {
  const weeks = [];
  let current = new Date(start);
  
  while(current < end) {
    // Get start of the week
    const beginOfWeek = new Date(current);
    // Get end of the week
    let endOfWeek = increaseDays(current, 6);
    endOfWeek.setHours(23);
    endOfWeek.setMinutes(59);
    // If there are less then 7 days left before the end, use the end.
    endOfWeek = endOfWeek > end ? end : endOfWeek;
    
    // Add week to our collection
    weeks.push([(beginOfWeek), (endOfWeek)]);
    
    current = increaseDays(current, 1);
    current.setHours(1)
  }
  
  return weeks;
}
const from = new Date("2023-08-20T08:00:00.000Z");
const to = new Date("2023-1-10T23:59:00.000Z");
export const weeks = buildWeeks(from, to);
export const getWeek = () => {
  /**
   * everything after 'to' is bowls until EOS
   */
  
  const today = new Date();
  const index = weeks.findIndex((weekRange) => {
    const isLaterThanBeginningOfWeek = weekRange[0] <= today;
    const isEarlierThanEndOfWeek = weekRange[1] >= today
    return isLaterThanBeginningOfWeek && isEarlierThanEndOfWeek;
  })
  return {
    week: index,
    weekRange: weeks[index]
  } 
}

export const daysOfTheWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];
export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];