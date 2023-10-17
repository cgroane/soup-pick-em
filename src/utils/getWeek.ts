export const getWeek = () => {
  const from = new Date("2023-08-26T08:00:00.000Z");
  const to = new Date("2023-12-11T08:00:00.000Z");
  /**
   * everything after 'to' is bowls until EOS
   */
  const increaseDays = (date: Date, amount: number) => new Date(date.setDate(date.getDate() + amount));

  // const buildDateString = (date: Date) => {
  //   const day = date.getDate().toString().padStart(2, "0");
  //   const month = (date.getMonth() + 1).toString().padStart(2, "0");
  //   const year = date.getFullYear();
    
  //   return `${day}.${month}.${year}`;
  // }
  const buildWeeks = (start: Date, end: Date) => {
    const weeks = [];
    let current = new Date(start);
    
    while(current < end) {
      // Get start of the week
      const beginOfWeek = new Date(current);
      // Get end of the week
      let endOfWeek = increaseDays(current, 6);
      // If there are less then 7 days left before the end, use the end.
      endOfWeek = endOfWeek > end ? end : endOfWeek;
      
      // Add week to our collection
      weeks.push([(beginOfWeek), (endOfWeek)]);
      
      current = increaseDays(current, 1);
    }
    
    return weeks;
  }

  const weeks = buildWeeks(from, to);
  const today = new Date();

  return weeks.findIndex((weekRange) => {
    const isLaterThanBeginningOfWeek = weekRange[0] <= today;
    const isEarlierThanEndOfWeek = weekRange[1] >= today
    return isLaterThanBeginningOfWeek && isEarlierThanEndOfWeek;
  })
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