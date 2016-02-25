$('.page-nav').find('a').each(function(){
    $(this).toggleClass('active', $(this).attr('href') == loc);
});