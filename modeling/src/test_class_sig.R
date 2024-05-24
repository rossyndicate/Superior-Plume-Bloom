test_class_sig <- function(dataset, band, class_col, ...){
  # there is some weird stuff happening with the statix package that make it
  # difficult (maybe impossible) to use a symbol or a string for all the steps 
  # here. To resolve that, creating a new data frame with just two columns with
  # the most basic, generic names
  df <- dataset %>% 
    select(band = !!band, 
           class = !!class_col,
           user_label_id,
           date) 
  
  # get list of extreme outliers
  out <- df %>% 
    group_by(class) %>% 
    identify_outliers(., band) %>% 
    filter(is.extreme)
  
  # perform a shapiro test for normality
  st <- shapiro_test(df, band)
  
  # if the distribution is non-normal, perform Kruskal-Walis test
  if (st$p < 0.05) {
    krus <- kruskal_test(df, band ~ class) %>% 
      mutate(.y. = deparse(band))
    # if the K-W test is significant, we have at least one group that is 
    # statistically different, we need to perform post-hoc tests for multiple
    # pairwise comparisons 
    # https://www.datanovia.com/en/lessons/kruskal-wallis-test-in-r/
    if (krus$p < 0.05) {
      dt <- dunn_test(data = df,
                      formula = band ~ class,
                      p.adjust.method = "bonferroni") %>% 
        mutate(.y. = deparse(band))
      # return a list of the dunn test and kruskal tests
      class_test <- list(krus, dt, out)
      names(class_test) <- c("class_difference", "pairwise_difference", "outliers")

      } else {
      
      # otherwise just return non-statistically significant Kruskal test
      message("Kruskal test did not detect significant differences between classes")
      class_test <- list(krus, out)
      names(class_test) <- c("class_difference", "outliers")
    }
  
  # if the data are normally distributed, we'll use an anova test
  } else {
    anov <- df %>% 
      anova_test(band ~ class) %>% 
      anova_summary(.)
    # if null is rejected, perform post-hoc pairwise
    if (anov$p < 0.05) {
      dt <- dunn_test(data = df,
                      formula = band ~ class,
                      p.adjust.method = "bonferroni") %>% 
        mutate(.y. = deparse(band))
      # return a list of the dunn test and anova tests
      class_test <- list(anov, dt, out)
      names(class_test) <- c("class_difference", "pairwise_difference", "outliers")
    } else {
      message("anova did not detect significant differences between classes")
      class_test <- list(anov, out)
      names(class_test) <- c("class_difference", "outliers")
    }
  }
  class_test
}

