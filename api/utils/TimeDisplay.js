module.exports.TimeDisplay= function(timeCreated){
    const periodSecond = Math.floor(Date.now() / 1000) - timeCreated;
    const periodMinute = Math.floor(periodSecond / 60);
    const periodHour = Math.floor(periodMinute / 60);
    const periodDay = Math.floor(periodHour / 24);
    const periodMonth = Math.floor(periodDay / 30);
    const periodYear = Math.floor(periodMonth / 12);
    var timeDisplay = 0;
    if (periodMinute < 1) {
      timeDisplay = "Vừa xong";
    } else if (periodHour < 1) {
      timeDisplay = periodMinute + " phút";
    } else if (periodHour < 24) {
      timeDisplay = periodHour + " giờ";
    } else if (periodDay < 30) {
      timeDisplay = periodDay + " ngày";
    } else if (periodYear < 1) {
      timeDisplay = periodMonth + " tháng";
    } else timeDisplay = periodYear + " năm";
return timeDisplay;
}