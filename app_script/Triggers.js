/*
 Triggers.gs

 Created by: Andre Remy
 Creation Date: 10/02/2020

 Contains instalable triggers (https://developers.google.com/apps-script/guides/triggers/installable)
 (This project) Edit -> Current project's triggers
*/

function runOnEdit(e){
  /*
  Function that is executed everytime there is a change in any column.
  Function set up as a trigger (installable trigger).
  
  e: Event object that has the information about the modified cell (https://developers.google.com/apps-script/guides/triggers/events).
  
  (returns): Returns nothing.
  */
  doPriceAndStatusUpdate(e);
}