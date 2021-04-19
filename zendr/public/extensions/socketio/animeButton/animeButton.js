class animeButton{

    constructor(className){

        this.ref = className;
        this.html = $(className).html();

    }
    // end of constructor

    animate(){

        let btn = $(this.ref);
    
        //disable the btn as well
        btn.attr("disabled", "true");
        
        //add the hover color
        btn.addClass('hovered-button');

        // anime elements
        let animeElem = `<span class="balls-container">
                        <span class="ball-1"></span>
                        <span class="ball-2"></span>
                        <span class="ball-3"></span>
                        </span>`;


        let height = $(btn).height();
        let width = $(btn).width();

        $(btn).empty();
        $(btn).html(animeElem);
        $(btn).height(height);
        $(btn).width(width);

        $(btn).addClass('anime-btn');




    }
    // end of animate

    killAnime(){

        let btn = $(this.ref);
        //remove disabled
        btn.removeAttr('disabled');
        // remove width and height
        btn.removeAttr('style');
        //add the hover color
        btn.removeClass('hovered-button');

        // remove balls
        btn.find('.balls-container').empty();
        btn.html(this.html);
        // remove anime button
        $(btn).removeClass('anime-btn');


    }
    // end of kill anime



}
// end of anime button